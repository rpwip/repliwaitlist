import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { 
  patients, queueEntries, insertPatientSchema,
  appointments, prescriptions, diagnoses, visitRecords,
  doctors, patientDoctorAssignments, patientPreferences, pharmacies, clinics,
  medicineOrders, insertVisitRecordSchema, insertDiagnosisSchema, insertPrescriptionSchema,
  doctorMetrics, doctorClinicAssignments, prescriptionAnalytics, medicationBrands, type SelectQueueEntry,
  
} from "@db/schema";
import { desc, eq, and, gt, sql, or } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { checkAndSendNotifications } from './services/notifications';
import { sendTestSMS } from './services/sms';
import { 
  medicationBrands, doctorMetrics, prescriptionAnalytics,
  insertVisitRecordSchema, type SelectMedicationBrand
} from "@db/schema";

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

  // Doctor registration endpoint
  app.post("/api/doctors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const [doctor] = await db
        .insert(doctors)
        .values({
          userId: req.user.id,
          fullName: req.body.fullName,
          specialization: req.body.specialization,
          qualifications: req.body.qualifications,
          contactNumber: req.body.contactNumber,
          availability: req.body.availability || {}
        })
        .returning();

      res.status(201).json({ ...req.user, doctor });
    } catch (error) {
      console.error('Doctor registration error:', error);
      res.status(500).send("Failed to register doctor");
    }
  });

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

      // Insert patient first
      const [patient] = await db
        .insert(patients)
        .values({
          fullName: result.data.fullName,
          email: result.data.email,
          mobile: result.data.mobile
        })
        .returning();

      // Then create queue entry
      const [entry] = await db
        .insert(queueEntries)
        .values({
          patientId: patient.id,
          queueNumber: nextQueueNumber,
          status: "pending", // Will be set to "waiting" after payment
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
          .set({ isPaid: true, status: 'waiting' }) // Mark as paid and set status to 'waiting'
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
      console.log('Fetching queue entries...');
      const avgWaitTime = await calculateAverageWaitTime();
      const entries = await db
        .select({
          id: queueEntries.id,
          queueNumber: queueEntries.queueNumber,
          status: queueEntries.status,
          clinicId: queueEntries.clinicId,
          patient: {
            id: patients.id,
            fullName: patients.fullName
          }
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

      console.log('Found queue entries:', entries.length);

      // Calculate estimated wait time for each patient
      const queueWithWaitTimes = entries.map((entry, index) => ({
        ...entry,
        estimatedWaitTime: Math.ceil(avgWaitTime * (index + 1))
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
  
  // Update the queue endpoint with proper error handling
  app.get("/api/queue/:clinicId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { clinicId } = req.params;

    try {
      console.log(`Fetching queue for clinic ${clinicId}`);

      // First verify the doctor has access to this clinic
      const [doctor] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user.id))
        .limit(1);

      if (!doctor) {
        console.log(`Doctor not found for user ${req.user.id}`);
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
        console.log(`No active clinic assignment found for doctor ${doctor.id} and clinic ${clinicId}`);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this clinic'
        });
      }

      // Fetch queue entries for clinic with proper error handling
      console.log(`Fetching queue entries for clinic ${clinicId}`);
      const entries = await db
        .select({
          id: queueEntries.id,
          queueNumber: queueEntries.queueNumber,
          status: queueEntries.status,
          isPaid: queueEntries.isPaid,
          patientId: patients.id,
          fullName: patients.fullName, // Changed from patientName to fullName for consistency
          createdAt: queueEntries.createdAt
        })
        .from(queueEntries)
        .innerJoin(patients, eq(queueEntries.patientId, patients.id))
        .where(
          and(
            eq(queueEntries.clinicId, parseInt(clinicId)),
            eq(queueEntries.isPaid, true),
            or(
              eq(queueEntries.status, "waiting"),
              eq(queueEntries.status, "in-progress")
            )
          )
        )
        .orderBy(queueEntries.queueNumber);

      if (!Array.isArray(entries)) {
        console.error('Invalid queue entries response:', entries);
        return res.status(500).json({
          error: 'Server error',
          message: 'Failed to fetch queue entries'
        });
      }

      // Calculate wait time
      let avgWaitTime: number;
      try {
        avgWaitTime = await calculateAverageWaitTime();
        console.log(`Average wait time calculated: ${avgWaitTime} minutes`);
      } catch (error) {
        console.error('Error calculating wait time:', error);
        avgWaitTime = 10; // Default to 10 minutes if calculation fails
      }

      // Format and validate each queue entry
       // Type definition for a queue entry
      /**
       * @typedef {Object} FormattedQueueEntry
       * @property {string} key - A unique key for React list rendering
       * @property {number} id - The unique ID of the queue entry
       * @property {number} queueNumber - The position of the patient in the queue
       * @property {string} status - The current status of the queue entry
       * @property {string} fullName - The full name of the patient
       * @property {number} estimatedWaitTime - The estimated wait time for the patient
       * @property {Date} createdAt - The timestamp when the queue entry was created
      */
      const queueWithWaitTimes = entries.map((entry, index) => {
        if (!entry || !entry.id || !entry.fullName) {
          console.error('Invalid queue entry:', entry);
          throw new Error('Invalid queue entry data');
        }

        const formattedEntry = {
          key: `${entry.id}`,
          id: entry.id,
          queueNumber: entry.queueNumber,
          status: entry.status,
          fullName: entry.fullName,
          estimatedWaitTime: Math.ceil(avgWaitTime * (index + 1)),
          createdAt: entry.createdAt
        };

        console.log(`Formatted queue entry: ${JSON.stringify(formattedEntry)}`);
        return formattedEntry;
      });

      console.log(`Sending response with ${queueWithWaitTimes.length} entries`);
      res.json(queueWithWaitTimes);

    } catch (error) {
      console.error('Queue fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch queue',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.get("/api/queue/:clinicId/completed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { clinicId } = req.params;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedPatients = await db
        .select({
          id: queueEntries.id,
          queueNumber: queueEntries.queueNumber,
          patientId: queueEntries.patientId,
          patient: patients,
          completedAt: queueEntries.updatedAt
        })
        .from(queueEntries)
        .innerJoin(patients, eq(queueEntries.patientId, patients.id))
        .where(
          and(
            eq(queueEntries.clinicId, parseInt(clinicId)),
            eq(queueEntries.status, "completed"),
            gt(queueEntries.updatedAt, today)
          )
        )
        .orderBy(desc(queueEntries.updatedAt));

      res.json(completedPatients);
    } catch (error) {
      console.error('Completed patients fetch error:', error);
      res.status(500).send("Failed to fetch completed patients");
    }
  });

  app.post("/api/queue/:queueId/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { queueId } = req.params;

    try {
      const [entry] = await db
        .update(queueEntries)
        .set({ 
          status: "in-progress",
          updatedAt: new Date()
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

  app.post("/api/queue/:queueId/skip", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { queueId } = req.params;

    try {
      const [entry] = await db
        .update(queueEntries)
        .set({
          status: "waiting",
          queueNumber: sql`(
            SELECT MAX(queue_number) + 1
            FROM queue_entries
            WHERE status = 'waiting'
          )`,
          updatedAt: new Date()
        })
        .where(eq(queueEntries.id, parseInt(queueId)))
        .returning();

      if (!entry) {
        return res.status(404).send("Queue entry not found");
      }

      wss.broadcast({ type: "QUEUE_UPDATE" });
      res.json(entry);
    } catch (error) {
      console.error('Skip patient error:', error);
      res.status(500).send("Failed to skip patient");
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
          updatedAt: new Date()
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
  app.get("/api/doctor/clinics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const [doctor] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user.id))
        .limit(1);

      if (!doctor) {
        return res.status(404).send("Doctor not found");
      }

      // First get clinic assignments with basic info
      const clinicAssignments = await db
        .select({
          clinicId: clinics.id,
          clinicName: clinics.name,
          clinicAddress: clinics.address,
          clinicType: clinics.type,
          clinicContactNumber: clinics.contactNumber,
          assignmentId: doctorClinicAssignments.id,
          isActive: doctorClinicAssignments.isActive
        })
        .from(doctorClinicAssignments)
        .innerJoin(clinics, eq(doctorClinicAssignments.clinicId, clinics.id))
        .where(
          and(
            eq(doctorClinicAssignments.doctorId, doctor.id),
            eq(doctorClinicAssignments.isActive, true)
          )
        );

      // Now get patient count and recent patients for each clinic
      const clinicsWithDetails = await Promise.all(
        clinicAssignments.map(async (clinic) => {
          // Get patient count
          const [{ count }] = await db
            .select({
              count: sql<number>`COUNT(DISTINCT ${patientDoctorAssignments.patientId})::integer`
            })
            .from(patientDoctorAssignments)
            .where(eq(patientDoctorAssignments.doctorId, doctor.id));

          // Get recent patients
          const recentPatients = await db
            .select({
              id: patients.id,
              fullName: patients.fullName,
              lastVisit: patientDoctorAssignments.assignedAt
            })
            .from(patientDoctorAssignments)
            .innerJoin(patients, eq(patientDoctorAssignments.patientId, patients.id))
            .where(eq(patientDoctorAssignments.doctorId, doctor.id))
            .orderBy(desc(patientDoctorAssignments.assignedAt))
            .limit(5);

          return {
            clinic: {
              id: clinic.clinicId,
              name: clinic.clinicName,
              address: clinic.clinicAddress,
              type: clinic.clinicType,
              contactNumber: clinic.clinicContactNumber
            },
            assignment: {
              id: clinic.assignmentId,
              isActive: clinic.isActive
            },
            patientCount: count,
            recentPatients
          };
        })
      );

      res.json(clinicsWithDetails);
    } catch (error) {
      console.error('Error fetching clinic data:', error);
      res.status(500).json({
        error: 'Failed to fetch clinic data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
// Update the GET /api/doctor/patients endpoint to support pagination
app.get("/api/doctor/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const page = parseInt(req.query.page as string) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
      const [doctor] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user.id))
        .limit(1);

      if (!doctor) {
        return res.status(404).send("Doctor not found");
      }

      // Get total count of unique patients
      const [{ count }] = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${patientDoctorAssignments.patientId})::integer`
        })
        .from(patientDoctorAssignments)
        .where(eq(patientDoctorAssignments.doctorId, doctor.id));

      // Get unique patients with their latest visit and active conditions
      const patientResults = await db
        .select({
          patient: patients,
          assignedAt: patientDoctorAssignments.assignedAt,
          lastVisit: sql<Date>`MAX(visit_records.visited_at)`.as('last_visit'),
          totalVisits: sql<number>`COUNT(DISTINCT visit_records.id)`.as('total_visits'),
          activeDiagnoses: sql<number>`COUNT(DISTINCT CASE WHEN diagnoses.status = 'Active' THEN diagnoses.id END)`.as('active_diagnoses'),
          activePresc: sql<number>`COUNT(DISTINCT CASE WHEN prescriptions.is_active = true THEN prescriptions.id END)`.as('active_prescriptions')
        })
        .from(patientDoctorAssignments)
        .innerJoin(patients, eq(patientDoctorAssignments.patientId, patients.id))
        .leftJoin(visitRecords, and(eq(visitRecords.patientId, patients.id),
          eq(visitRecords.doctorId, doctor.id)
        ))
        .leftJoin(diagnoses, and(
          eq(diagnoses.patientId, patients.id),
          eq(diagnoses.doctorId, doctor.id)
        ))
        .leftJoin(prescriptions, and(
          eq(prescriptions.patientId, patients.id),
          eq(prescriptions.doctorId, doctor.id)
        ))
        .where(eq(patientDoctorAssignments.doctorId, doctor.id))
        .groupBy(
          patients.id,
          patientDoctorAssignments.assignedAt
        )
        .orderBy(desc(sql<Date>`MAX(visit_records.visited_at)`))
        .limit(limit)
        .offset(offset);

      res.json({
        patients: patientResults,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: page,
          perPage: limit
        }
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
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

      // Fetch all related records using Promise.all with proper typing
      const [visitsData, diagnosesData, prescriptionsData, appointmentsData] = await Promise.all([
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
        visits: visitsData,
        diagnoses: diagnosesData,
        prescriptions: prescriptionsData,
        appointments: appointmentsData
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
  });app.post("/api/doctor/prescriptions", async (req, res) => {
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
// Add these routes after the existing doctor-related endpoints
// Doctor Dashboard API endpoints
app.get("/api/doctor/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, req.user.id))
      .limit(1);

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    // Get last 12 months of metrics
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    const metrics = await db
      .select()
      .from(doctorMetrics)
      .where(
        and(
          eq(doctorMetrics.doctorId, doctor.id),
          gt(doctorMetrics.date, startDate)
        )
      )
      .orderBy(desc(doctorMetrics.date));

      // Get clinic assignments with clinic details and patient counts
      const clinicAssignments = await db
        .select({
          assignment: doctorClinicAssignments,
          clinic: clinics,
          patientCount: sql<number>`
            COUNT(DISTINCT patient_doctor_assignments.patient_id)
          `.as('patient_count')
        })
        .from(doctorClinicAssignments)
        .innerJoin(clinics, eq(doctorClinicAssignments.clinicId, clinics.id))
        .leftJoin(
          patientDoctorAssignments,
          eq(patientDoctorAssignments.doctorId, doctorClinicAssignments.doctorId)
        )
        .where(
          and(
            eq(doctorClinicAssignments.doctorId, doctor.id),
            eq(doctorClinicAssignments.isActive, true)
          )
        )
        .groupBy(
          doctorClinicAssignments.id,
          clinics.id
        );

    // Get recent patients
    const recentPatients = await db
      .select()
      .from(patients)
      .innerJoin(patientDoctorAssignments, eq(patients.id, patientDoctorAssignments.patientId))
      .where(eq(patientDoctorAssignments.doctorId, doctor.id))
      .orderBy(desc(patients.registeredAt))
      .limit(5);

    // Calculate performance rank
    const [rank] = await db
      .select({
        rank: sql<number>`
          rank() over (order by sum(doctor_metrics.revenue) desc)
        `.as('rank')
      })
      .from(doctorMetrics)
      .where(eq(doctorMetrics.doctorId, doctor.id))
      .groupBy(doctorMetrics.doctorId)
      .limit(1);

    // Get prescription statistics
    const prescriptionStats = await db
      .select({
        totalCount: sql<number>`count(distinct prescriptions.id)`,
        cloudCarePartnerCount: sql<number>`
          count(distinct case when medication_brands.is_cloud_care_partner then prescriptions.id end)
        `,
        nonPartnerCount: sql<number>`
          count(distinct case when not medication_brands.is_cloud_care_partner then prescriptions.id end)
        `,
        potentialExtraRewards: sql<number>`
          sum(case when not medication_brands.is_cloud_care_partner then medication_brands.reward_points else 0 end)
        `
      })
      .from(prescriptions)
      .innerJoin(
        prescriptionAnalytics,
        eq(prescriptionAnalytics.prescriptionId, prescriptions.id)
      )
      .innerJoin(
        medicationBrands,
        eq(prescriptionAnalytics.medicationBrandId, medicationBrands.id)
      )
      .where(eq(prescriptions.doctorId, doctor.id));

    // Get brand distribution
    const brandDistribution = await db
      .select({
        brandName: medicationBrands.brandName,
        isCloudCarePartner: medicationBrands.isCloudCarePartner,
        count: sql<number>`count(distinct prescriptions.id)`
      })
      .from(prescriptions)
      .innerJoin(
        prescriptionAnalytics,
        eq(prescriptionAnalytics.prescriptionId, prescriptions.id)
      )
      .innerJoin(
        medicationBrands,
        eq(prescriptionAnalytics.medicationBrandId, medicationBrands.id)
      )
      .where(eq(prescriptions.doctorId, doctor.id))
      .groupBy(medicationBrands.brandName, medicationBrands.isCloudCarePartner);

    // Calculate reward points from prescriptions
    const [rewardPoints] = await db
      .select({
        total: sql<number>`sum(reward_points_earned)`.as('total')
      })
      .from(prescriptionAnalytics)
      .innerJoin(prescriptions, eq(prescriptionAnalytics.prescriptionId, prescriptions.id))
      .where(eq(prescriptions.doctorId, doctor.id))
      .limit(1);

    // Calculate total and projected earnings
    const [earnings] = await db
      .select({
        total: sql<number>`sum(revenue)`.as('total'),
        projected: sql<number>`sum(revenue) + (avg(revenue) * 3)`.as('projected')
      }).from(doctorMetrics)
      .where(eq(doctorMetrics.doctorId, doctor.id))
      .limit(1);

      res.json({
        metrics,
        clinicAssignments,
        recentPatients,
        performanceRank: rank?.rank || 1,
        totalEarnings: earnings?.total || 0,
        projectedEarnings: earnings?.projected || 0,
        rewardPoints: rewardPoints?.total || 0,
        prescriptionStats: {
          ...prescriptionStats[0],
          brandDistribution
        }
      });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send("Failed to fetch dashboard data");
  }
});
// Add this new endpoint after existing doctor dashboard endpoints
app.get("/api/doctor/top-brands", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const { search } = req.query;

  try {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, req.user.id))
      .limit(1);

    if (!doctor) {
      return res.status(404).send("Doctor not found");
    }

    // Base query for top brands
    const baseQuery = db
      .select({
        brandName: medicationBrands.brandName,
        genericName: medicationBrands.genericName,
        manufacturer: medicationBrands.manufacturer,
        totalPrescribed: sql<number>`sum(prescription_analytics.quantity)`,
        totalRevenue: sql<number>`sum(prescription_analytics.revenue)`,
        isCloudCarePartner: medicationBrands.isCloudCarePartner
      })
      .from(prescriptionAnalytics)
      .innerJoin(prescriptions, eq(prescriptionAnalytics.prescriptionId, prescriptions.id))
      .innerJoin(medicationBrands, eq(prescriptionAnalytics.medicationBrandId, medicationBrands.id))
      .where(eq(prescriptions.doctorId, doctor.id));

    // Add search condition if search term provided
    const query = search
      ? baseQuery.where(
          or(
            sql`lower(${medicationBrands.brandName}) like ${`%${search.toLowerCase()}%`}`,
            sql`lower(${medicationBrands.genericName}) like ${`%${search.toLowerCase()}%`}`
          )
        )
      : baseQuery;

    // Complete the query with grouping and ordering
    const results = await query
      .groupBy(
        medicationBrands.brandName,
        medicationBrands.genericName,
        medicationBrands.manufacturer,
        medicationBrands.isCloudCarePartner
      )
      .orderBy(sql`sum(prescription_analytics.quantity) desc`)
      .limit(10);

    res.json(results);
  } catch (error) {
    console.error('Error fetching top brands:', error);
    res.status(500).send("Failed to fetch top brands data");
  }
});
  
  app.get("/api/common-diseases", async (req, res) => {
    const { search } = req.query;
    try {
      // In production, this would be fetched from a medical API
      // For now, we'll use a static list of common diseases
      const commonDiseases = [
        { id: "covid19", name: "COVID-19", isActive: true, category: "Respiratory" },
        { id: "flu", name: "Influenza", isActive: true, category: "Respiratory" },
        { id: "diabetes", name: "Type 2 Diabetes", isActive: true, category: "Metabolic" },
        { id: "hypertension", name: "Hypertension", isActive: true, category: "Cardiovascular" },
        { id: "asthma", name: "Asthma", isActive: true, category: "Respiratory" },
        { id: "arthritis", name: "Arthritis", isActive: true, category: "Musculoskeletal" }
      ];

      if (search) {
        const searchLower = (search as string).toLowerCase();
        const filtered = commonDiseases.filter(disease => 
          disease.name.toLowerCase().includes(searchLower) ||
          disease.category.toLowerCase().includes(searchLower)
        );
        return res.json(filtered);
      }

      res.json(commonDiseases);
    } catch (error) {
      console.error('Error fetching common diseases:', error);
      res.status(500).send("Failed to fetch common diseases");
    }
  });

  app.get("/api/medication-suggestions/:diseaseId", async (req, res) => {
    const { diseaseId } = req.params;
    try {
      // First get Cloud Care partner brands
      const partnerBrands = await db
        .select()
        .from(medicationBrands)
        .where(eq(medicationBrands.isCloudCarePartner, true));

      // In production, this would integrate with a medical API
      // For now, we'll use basic mapping of diseases to medications
      const diseaseMedications: Record<string, Array<{
        brandName: string,
        genericName: string,
        dosageRecommendation: string,
        frequencyRecommendation: string
      }>> = {
        "covid19": [
          {
            brandName: "Paxlovid",
            genericName: "nirmatrelvir/ritonavir",
            dosageRecommendation: "300mg/100mg",
            frequencyRecommendation: "Twice daily for 5 days"
          }
        ],
        "flu": [
          {
            brandName: "Tamiflu",
            genericName: "oseltamivir",
            dosageRecommendation: "75mg",
            frequencyRecommendation: "Twice daily for 5 days"
          }
        ],
        "diabetes": [
          {
            brandName: "Metformin",
            genericName: "metformin hydrochloride",
            dosageRecommendation: "500mg",
            frequencyRecommendation: "Twice daily with meals"
          }
        ],
        "hypertension": [
          {
            brandName: "Amlodipine",
            genericName: "amlodipine besylate",
            dosageRecommendation: "5mg",
            frequencyRecommendation: "Once daily"
          }
        ]
      };

      const medications = diseaseMedications[diseaseId] || [];

      // Enhance medications with Cloud Care partner status
      const enhancedMedications = medications.map(med => ({
        ...med,
        isCloudCarePartner: partnerBrands.some(
          brand => brand.brandName.toLowerCase() === med.brandName.toLowerCase()
        )
      }));

      res.json(enhancedMedications);
    } catch (error) {
      console.error('Error fetching medication suggestions:', error);
      res.status(500).send("Failed to fetch medication suggestions");
    }
  });

  // Update the visit records endpoint to handle the enhanced records
  app.post("/api/visits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertVisitRecordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    try {
      // Begin transaction
      await db.transaction(async (tx) => {
        // 1. Create visit record
        const [visit] = await tx
          .insert(visitRecords)
          .values(result.data)
          .returning();

        // 2. If there's a new diagnosis, insert it
        if (req.body.newDiagnosis) {
          await tx
            .insert(diagnoses)
            .values({
              patientId: result.data.patientId,
              doctorId: result.data.doctorId,
              condition: req.body.newDiagnosis,
              notes: req.body.diagnosisNotes,
              status: "active"
            });
        }

        // 3. If updating existing diagnoses statuses
        if (req.body.diagnosisUpdates) {
          for (const update of req.body.diagnosisUpdates) {
            await tx
              .update(diagnoses)
              .set({ status: update.status })
              .where(eq(diagnoses.id, update.id));
          }
        }

        // 4. If there are new prescriptions
        if (req.body.prescriptions) {
          for (const prescription of req.body.prescriptions) {
            const [prescRecord] = await tx
              .insert(prescriptions)
              .values({
                patientId: result.data.patientId,
                doctorId: result.data.doctorId,
                medications: prescription.medications,
                instructions: prescription.instructions,
                startDate: prescription.startDate,
                endDate: prescription.endDate,
                isActive: true
              })
              .returning();

            // Track prescription analytics
            if (prescription.brandId) {
              await tx
                .insert(prescriptionAnalytics)
                .values({
                  prescriptionId: prescRecord.id,
                  medicationBrandId: prescription.brandId,
                  quantity: prescription.quantity || 1,
                  rewardPointsEarned: 0 // Will be calculated by a trigger
                });
            }
          }
        }

        // Return the complete visit record
        res.status(201).json(visit);
      });
    } catch (error) {
      console.error('Error creating visit record:', error);
      res.status(500).send("Failed to create visit record");
    }
  });
  
// Add new endpoints after the existing ones
  app.get("/api/diagnosis-suggestions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { symptoms } = req.query;

    try {
      // Note: In a production environment, this would call an external API
      // For demo purposes, returning mock suggestions based on common symptoms
      const suggestions = [
        { id: "fever", name: "Viral Fever", confidence: 0.85 },
        { id: "cold", name: "Common Cold", confidence: 0.75 },
        { id: "flu", name: "Influenza", confidence: 0.70 },
        { id: "allergies", name: "Seasonal Allergies", confidence: 0.65 }
      ].filter(s => 
        symptoms ? s.name.toLowerCase().includes((symptoms as string).toLowerCase()) : true
      );

      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching diagnosis suggestions:', error);
      res.status(500).send("Failed to fetch diagnosis suggestions");
    }
  });

  // Enhanced visit record creation endpoint
  app.post("/api/visits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const [doctor] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, req.user.id))
        .limit(1);

      if (!doctor) {
        return res.status(404).send("Doctor not found");
      }

      // Start a transaction to ensure all related records are created atomically
      const visitRecord = await db.transaction(async (tx) => {
        // Create the visit record
        const [visit] = await tx
          .insert(visitRecords)
          .values({
            patientId: req.body.patientId,
            doctorId: doctor.id,
            symptoms: req.body.symptoms,
            diagnosis: req.body.diagnosis,
            vitals: req.body.vitals,
            comments: req.body.comments,
            visitedAt: new Date(),
          })
          .returning();

        // Create diagnosis record if provided
        if (req.body.diagnosis) {
          await tx
            .insert(diagnoses)
            .values({
              patientId: req.body.patientId,
              doctorId: doctor.id,
              condition: req.body.diagnosis,
              status: "Active",
              notes: req.body.comments,
              diagnosedAt: new Date(),
            });
        }

        // Create prescription records if provided
        if (req.body.prescriptions?.length > 0) {
          await tx
            .insert(prescriptions)
            .values({
              patientId: req.body.patientId,
              doctorId: doctor.id,
              medications: req.body.prescriptions,
              isActive: true,
              instructions: req.body.comments,
              createdAt: new Date(),
            });
        }

        // Create lab order records if provided
        // Note: Assuming you have a labOrders table in your schema
        if (req.body.labOrders?.length > 0) {
          for (const order of req.body.labOrders) {
            await tx
              .insert(labOrders)
              .values({
                patientId: req.body.patientId,
                doctorId: doctor.id,
                testName: order.name,
                reason: order.reason,
                urgency: order.urgency,
                status: "pending",
                orderedAt: new Date(),
              });
          }
        }

        return visit;
      });

      res.status(201).json(visitRecord);
    } catch (error) {
      console.error('Error creating visit record:', error);
      res.status(500).send("Failed to create visit record");
    }
  });
  
// Add clinics endpoint with improved error handling
app.get("/api/clinics", async (_req, res) => {
  try {
    console.log('Fetching clinics data...');
    const clinicsData = await db
      .select({
        id: clinics.id,
        name: clinics.name,
        address: clinics.address,
        contactNumber: clinics.contactNumber,
        type: clinics.type,
      })
      .from(clinics)
      .orderBy(clinics.name);

    console.log(`Found ${clinicsData.length} clinics`);

    if (!clinicsData || clinicsData.length === 0) {
      console.log('No clinics found in database');
      return res.status(404).json({
        error: 'Not Found',
        message: 'No clinics available'
      });
    }

    res.json(clinicsData);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({
      error: 'Failed to fetch clinics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

  return httpServer;
}