import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { 
  patients, queueEntries, insertPatientSchema,
  appointments, visitRecords,
  doctors, clinics,
  doctorMetrics, doctorClinicAssignments,
  insertVisitRecordSchema
} from "@db/schema";
import { desc, eq, and, gt, sql, or } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

// Store pending transactions in memory (in production, use Redis or database)
const pendingTransactions = new Map<string, { queueId: number, amount: number }>();

// Calculate average consultation time (in minutes) for the day
async function calculateAverageWaitTime(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [result] = await db
      .select({
        avgTime: sql<number>`
          avg(extract(epoch from (end_time - start_time)) / 60)
          filter (where status = 'completed' and check_in_time >= ${today})
        `.as('avg_time')
      })
      .from(queueEntries);

    // Return average time or minimum 10 minutes
    return Math.max(result?.avgTime || 10, 10);
  } catch (error) {
    console.error('Error calculating average wait time:', error);
    return 10; // Default to 10 minutes on error
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = setupWebSocketServer(httpServer);

  // Doctor registration endpoint
  app.post("/api/doctors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const [doctor] = await db
        .insert(doctors)
        .values({
          userId: req.user!.id,
          fullName: req.body.fullName,
          specialization: req.body.specialization,
          qualifications: req.body.qualifications,
          contactNumber: req.body.contactNumber,
          registrationNumber: req.body.registrationNumber,
          availability: req.body.availability || {}
        })
        .returning();

      res.status(201).json({ ...req.user, doctor });
    } catch (error) {
      console.error('Doctor registration error:', error);
      res.status(500).send("Failed to register doctor");
    }
  });

  // Patient Portal API endpoints
  app.get("/api/patient/profile", async (req, res) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, parseInt(id as string)))
        .limit(1);

      if (!patient) {
        return res.status(404).send("Patient not found");
      }

      // Get queue entry if exists
      const [queueEntry] = await db
        .select()
        .from(queueEntries)
        .where(
          and(
            eq(queueEntries.patientId, patient.id),
            or(
              eq(queueEntries.status, "waiting"),
              eq(queueEntries.status, "in-progress")
            )
          )
        )
        .limit(1);

      // Calculate estimated wait time if in queue
      let patientResponse = patient;
      if (queueEntry) {
        const avgWaitTime = await calculateAverageWaitTime();
        const [queuePosition] = await db
          .select({
            position: sql<number>`
              COUNT(*) FILTER (WHERE queue_entries.queue_number <= ${queueEntry.queueNumber} 
              AND queue_entries.status = 'waiting')
            `.as('position')
          })
          .from(queueEntries)
          .limit(1);

        patientResponse = {
          ...patient,
          queueEntry: {
            ...queueEntry,
            estimatedWaitTime: Math.ceil(avgWaitTime * (queuePosition?.position || 1))
          }
        };
      }

      res.json(patientResponse);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).send("Failed to fetch patient profile");
    }
  });

  app.get("/api/patient/visits", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const results = await db
        .select()
        .from(visitRecords)
        .innerJoin(doctors, eq(visitRecords.doctorId, doctors.id))
        .where(eq(visitRecords.patientId, parseInt(patientId as string)))
        .orderBy(desc(visitRecords.visitedAt));

      res.json(results);
    } catch (error) {
      console.error('Visit records fetch error:', error);
      res.status(500).send("Failed to fetch visit records");
    }
  });

  app.get("/api/patient/appointments", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const results = await db
        .select()
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
        .where(eq(appointments.patientId, parseInt(patientId as string)))
        .orderBy(desc(appointments.scheduledFor));

      res.json(results);
    } catch (error) {
      console.error('Appointments fetch error:', error);
      res.status(500).send("Failed to fetch appointments");
    }
  });

  // Public endpoints
  app.post("/api/register-patient", async (req, res) => {
    const result = insertPatientSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    try {
      // Get the maximum queue number for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [lastQueueEntry] = await db
        .select()
        .from(queueEntries)
        .where(gt(queueEntries.checkInTime, today))
        .orderBy(desc(queueEntries.queueNumber))
        .limit(1);

      const nextQueueNumber = (lastQueueEntry?.queueNumber || 0) + 1;

      const [patient] = await db.insert(patients).values(result.data).returning();
      const [entry] = await db
        .insert(queueEntries)
        .values({
          patientId: patient.id,
          queueNumber: nextQueueNumber,
          status: "waiting",
          clinicId: req.body.clinicId
        })
        .returning();

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.status(201).json({ patient, queueEntry: entry });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).send("Failed to register patient");
    }
  });

  // Queue management endpoints
  app.get("/api/queue/:clinicId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { clinicId } = req.params;

    try {
      const [doctor] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user!.id))
        .limit(1);

      if (!doctor) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Doctor not found'
        });
      }

      const [assignment] = await db
        .select()
        .from(doctorClinicAssignments)
        .where(
          and(
            eq(doctorClinicAssignments.doctorId, doctor.id),
            eq(doctorClinicAssignments.clinicId, parseInt(clinicId)),
            eq(doctorClinicAssignments.isActive, true)
          )
        )
        .limit(1);

      if (!assignment) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this clinic'
        });
      }

      const entries = await db
        .select({
          id: queueEntries.id,
          queueNumber: queueEntries.queueNumber,
          status: queueEntries.status,
          patientId: patients.id,
          fullName: patients.fullName,
          checkInTime: queueEntries.checkInTime
        })
        .from(queueEntries)
        .innerJoin(patients, eq(queueEntries.patientId, patients.id))
        .where(
          and(
            eq(queueEntries.clinicId, parseInt(clinicId)),
            or(
              eq(queueEntries.status, "waiting"),
              eq(queueEntries.status, "in-progress")
            )
          )
        )
        .orderBy(queueEntries.queueNumber);

      // Calculate wait time
      const avgWaitTime = await calculateAverageWaitTime();
      const queueWithWaitTimes = entries.map((entry, index) => ({
        key: `${entry.id}`,
        id: entry.id,
        queueNumber: entry.queueNumber,
        status: entry.status,
        fullName: entry.fullName,
        estimatedWaitTime: Math.ceil(avgWaitTime * (index + 1)),
        checkInTime: entry.checkInTime
      }));

      res.json(queueWithWaitTimes);
    } catch (error) {
      console.error('Queue fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch queue',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Queue action endpoints
  app.post("/api/queue/:queueId/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { queueId } = req.params;

    try {
      const [entry] = await db
        .update(queueEntries)
        .set({ 
          status: "in-progress",
          startTime: new Date()
        })
        .where(eq(queueEntries.id, parseInt(queueId)))
        .returning();

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.json(entry);
    } catch (error) {
      console.error('Start consultation error:', error);
      res.status(500).send("Failed to start consultation");
    }
  });

  app.post("/api/queue/:queueId/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { queueId } = req.params;

    try {
      const [entry] = await db
        .update(queueEntries)
        .set({ 
          status: "completed",
          endTime: new Date()
        })
        .where(eq(queueEntries.id, parseInt(queueId)))
        .returning();

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.json(entry);
    } catch (error) {
      console.error('Complete consultation error:', error);
      res.status(500).send("Failed to complete consultation");
    }
  });

  return httpServer;
}