import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { 
  patients, queueEntries, insertPatientSchema,
  appointments, prescriptions, diagnoses, visitRecords,
  doctors, patientDoctorAssignments
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
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).send("Mobile number is required");
    }
  
    try {
      const results = await db
        .select()
        .from(patients)
        .where(eq(patients.mobile, mobile as string));
  
      if (results.length === 0) {
        return res.status(404).send("Patient not found");
      }
  
      // If there's only one patient, return it as an object
      // If there are multiple patients, return them as an array
      res.json(results);
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
  return httpServer;
}