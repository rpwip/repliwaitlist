import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { 
  patients, queueEntries, insertPatientSchema,
  appointments, prescriptions, diagnoses, visitRecords,
  doctors, patientDoctorAssignments, patientPreferences, pharmacies, clinics,
  medicineOrders, insertVisitRecordSchema, insertDiagnosisSchema, insertPrescriptionSchema
} from "@db/schema";
import { desc, eq, and, gt, sql, or } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { checkAndSendNotifications } from './services/notifications';
import { sendTestSMS } from './services/sms';

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
          avg(extract(epoch from (updated_at - created_at)) / 60)
          filter (where status = 'completed' and created_at >= ${today})
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

  app.get("/api/patient/prescriptions", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const results = await db
        .select()
        .from(prescriptions)
        .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
        .where(
          and(
            eq(prescriptions.patientId, parseInt(patientId as string)),
            eq(prescriptions.isActive, true)
          )
        )
        .orderBy(desc(prescriptions.createdAt));

      res.json(results);
    } catch (error) {
      console.error('Prescriptions fetch error:', error);
      res.status(500).send("Failed to fetch prescriptions");
    }
  });

  app.get("/api/patient/diagnoses", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const results = await db
        .select()
        .from(diagnoses)
        .innerJoin(doctors, eq(diagnoses.doctorId, doctors.id))
        .where(eq(diagnoses.patientId, parseInt(patientId as string)))
        .orderBy(desc(diagnoses.diagnosedAt));

      res.json(results);
    } catch (error) {
      console.error('Diagnoses fetch error:', error);
      res.status(500).send("Failed to fetch diagnoses");
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

  // Get patient preferences
  app.get("/api/patient/preferences", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const [preferences] = await db
        .select({
          patientPreferences: patientPreferences,
          pharmacy: pharmacies,
          doctor: doctors,
          clinic: clinics,
        })
        .from(patientPreferences)
        .leftJoin(pharmacies, eq(patientPreferences.preferredPharmacyId, pharmacies.id))
        .leftJoin(doctors, eq(patientPreferences.primaryDoctorId, doctors.id))
        .leftJoin(clinics, eq(patientPreferences.preferredClinicId, clinics.id))
        .where(eq(patientPreferences.patientId, parseInt(patientId as string)));

      res.json(preferences);
    } catch (error) {
      console.error('Preferences fetch error:', error);
      res.status(500).send("Failed to fetch patient preferences");
    }
  });

  // Get medicine orders
  app.get("/api/patient/medicine-orders", async (req, res) => {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).send("Patient ID is required");
    }

    try {
      const orders = await db
        .select({
          medicineOrders: medicineOrders,
          pharmacy: pharmacies,
          prescription: prescriptions,
        })
        .from(medicineOrders)
        .innerJoin(pharmacies, eq(medicineOrders.pharmacyId, pharmacies.id))
        .innerJoin(prescriptions, eq(medicineOrders.prescriptionId, prescriptions.id))
        .where(eq(medicineOrders.patientId, parseInt(patientId as string)))
        .orderBy(desc(medicineOrders.createdAt));

      res.json(orders);
    } catch (error) {
      console.error('Medicine orders fetch error:', error);
      res.status(500).send("Failed to fetch medicine orders");
    }
  });

  // Update delivery preferences
  app.post("/api/patient/delivery-preferences", async (req, res) => {
    const { patientId, deliveryMethod } = req.body;
    if (!patientId || !deliveryMethod) {
      return res.status(400).send("Patient ID and delivery method are required");
    }

    try {
      const [updated] = await db
        .update(medicineOrders)
        .set({ deliveryMethod })
        .where(eq(medicineOrders.patientId, patientId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Delivery preferences update error:', error);
      res.status(500).send("Failed to update delivery preferences");
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
        .where(gt(queueEntries.createdAt, today))
        .orderBy(desc(queueEntries.queueNumber))
        .limit(1);

      const nextQueueNumber = (lastQueueEntry?.queueNumber || 0) + 1;

      const [patient] = await db.insert(patients).values(result.data).returning();
      const [entry] = await db
        .insert(queueEntries)
        .values({
          patientId: patient.id,
          queueNumber: nextQueueNumber,
          status: "pending" // Will be set to "waiting" after payment
        })
        .returning();

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.status(201).json({ patient, queueEntry: entry });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).send("Failed to register patient");
    }
  });

  // UPI Payment webhook endpoint (this would be called by your UPI payment provider)
  app.post("/api/upi-webhook", async (req, res) => {
    try {
      const { transactionRef, status, amount } = req.body;

      // Verify the webhook signature (implement based on your payment provider)
      // verifyWebhookSignature(req);

      const pendingTxn = pendingTransactions.get(transactionRef);
      if (!pendingTxn) {
        return res.status(404).send("Transaction not found");
      }

      if (status === "SUCCESS" && amount === pendingTxn.amount) {
        const [entry] = await db
          .update(queueEntries)
          .set({ isPaid: true })
          .where(eq(queueEntries.id, pendingTxn.queueId))
          .returning();

        if (entry) {
          pendingTransactions.delete(transactionRef);
          wss.broadcast({ type: "QUEUE_UPDATE" });
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('UPI webhook error:', error);
      res.status(500).send("Failed to process UPI webhook");
    }
  });

  // Check payment status
  app.get("/api/verify-payment/:queueId/:transactionRef", async (req, res) => {
    try {
      const { queueId, transactionRef } = req.params;

      // In production, make an API call to your UPI provider to check status
      // const status = await checkUPITransactionStatus(transactionRef);

      const [entry] = await db
        .select()
        .from(queueEntries)
        .where(eq(queueEntries.id, parseInt(queueId)))
        .limit(1);

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      res.json({ verified: entry.isPaid });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).send("Failed to verify payment");
    }
  });

  app.post("/api/confirm-payment/:queueId", async (req, res) => {
    const { queueId } = req.params;
    try {
      const [entry] = await db
        .update(queueEntries)
        .set({ 
          isPaid: true,
          status: "waiting" // Set initial status when payment is confirmed
        })
        .where(eq(queueEntries.id, parseInt(queueId)))
        .returning();

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.json(entry);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).send("Failed to confirm payment");
    }
  });

  app.get("/api/queue", async (_req, res) => {
    try {
      const avgWaitTime = await calculateAverageWaitTime();
      const entries = await db
        .select({
          id: queueEntries.id,
          queueNumber: queueEntries.queueNumber,
          status: queueEntries.status,
          isPaid: queueEntries.isPaid,
          createdAt: queueEntries.createdAt,
          patientId: queueEntries.patientId,
          patient: patients
        })
        .from(queueEntries)
        .innerJoin(patients, eq(queueEntries.patientId, patients.id))
        .where(
          and(
            eq(queueEntries.isPaid, true),
            or(
              eq(queueEntries.status, "waiting"),
              eq(queueEntries.status, "in-progress")
            )
          )
        )
        .orderBy(queueEntries.queueNumber);

      // Calculate estimated wait time for each patient
      const queueWithWaitTimes = entries.map((entry, index) => ({
        ...entry,
        estimatedWaitTime: Math.ceil(avgWaitTime * (index + 1))
      }));

      // Check and send notifications if needed
      await checkAndSendNotifications(avgWaitTime);

      res.json(queueWithWaitTimes);
    } catch (error) {
      console.error('Queue fetch error:', error);
      res.status(500).send("Failed to fetch queue");
    }
  });

  // Protected endpoints
  app.post("/api/queue/:queueId/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { queueId } = req.params;
    const { status } = req.body;

    if (!["waiting", "in-progress", "completed"].includes(status)) {
      return res.status(400).send("Invalid status");
    }

    try {
      const [entry] = await db
        .update(queueEntries)
        .set({ status })
        .where(eq(queueEntries.id, parseInt(queueId)))
        .returning();

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.json(entry);
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).send("Failed to update status");
    }
  });

  // Test SMS endpoint
  app.post("/api/test-sms", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).send("Phone number is required");
    }

    try {
      const success = await sendTestSMS(phoneNumber);
      if (success) {
        res.json({ message: "Test SMS sent successfully" });
      } else {
        res.status(500).send("Failed to send test SMS");
      }
    } catch (error) {
      console.error('Test SMS error:', error);
      res.status(500).send("Failed to send test SMS");
    }
  });

  // Doctor Portal API endpoints
  app.get("/api/doctor/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).send("Doctor ID is required");
    }

    try {
      const assignedPatients = await db
        .select({
          patients: patients,
          assignments: patientDoctorAssignments,
        })
        .from(patientDoctorAssignments)
        .innerJoin(patients, eq(patientDoctorAssignments.patientId, patients.id))
        .where(eq(patientDoctorAssignments.doctorId, parseInt(doctorId as string)));

      res.json(assignedPatients.map(({ patients }) => patients));
    } catch (error) {
      console.error('Error fetching doctor\'s patients:', error);
      res.status(500).send("Failed to fetch patients");
    }
  });

  app.get("/api/doctor/patient-history/:patientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { patientId } = req.params;

    try {
      // Fetch patient basic info
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, parseInt(patientId)))
        .limit(1);

      if (!patient) {
        return res.status(404).send("Patient not found");
      }

      // Fetch all related records
      const [visits, diagnoses, prescriptions, appointments] = await Promise.all([
        db.select().from(visitRecords)
          .where(eq(visitRecords.patientId, patient.id))
          .orderBy(desc(visitRecords.visitedAt)),
        db.select().from(diagnoses)
          .where(eq(diagnoses.patientId, patient.id))
          .orderBy(desc(diagnoses.diagnosedAt)),
        db.select().from(prescriptions)
          .where(eq(prescriptions.patientId, patient.id))
          .orderBy(desc(prescriptions.createdAt)),
        db.select().from(appointments)
          .where(eq(appointments.patientId, patient.id))
          .orderBy(desc(appointments.scheduledFor))
      ]);

      res.json({
        ...patient,
        visits,
        diagnoses,
        prescriptions,
        appointments
      });
    } catch (error) {
      console.error('Error fetching patient history:', error);
      res.status(500).send("Failed to fetch patient history");
    }
  });

  app.post("/api/doctor/visits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertVisitRecordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    try {
      const [visit] = await db
        .insert(visitRecords)
        .values(result.data)
        .returning();

      res.status(201).json(visit);
    } catch (error) {
      console.error('Error creating visit record:', error);
      res.status(500).send("Failed to create visit record");
    }
  });

  app.post("/api/doctor/diagnoses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertDiagnosisSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    try {
      const [diagnosis] = await db
        .insert(diagnoses)
        .values(result.data)
        .returning();

      res.status(201).json(diagnosis);
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      res.status(500).send("Failed to create diagnosis");
    }
  });

  app.post("/api/doctor/prescriptions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertPrescriptionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    try {
      const [prescription] = await db
        .insert(prescriptions)
        .values(result.data)
        .returning();

      res.status(201).json(prescription);
    } catch (error) {
      console.error('Error creating prescription:', error);
      res.status(500).send("Failed to create prescription");
    }
  });

  return httpServer;
}