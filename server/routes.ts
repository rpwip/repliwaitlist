import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { patients, queueEntries, insertPatientSchema } from "@db/schema";
import { desc, eq, and } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

// Store pending transactions in memory (in production, use Redis or database)
const pendingTransactions = new Map<string, { queueId: number, amount: number }>();

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = setupWebSocketServer(httpServer);

  // Public endpoints
  app.post("/api/register-patient", async (req, res) => {
    const result = insertPatientSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(fromZodError(result.error).toString());
    }

    const [lastQueueEntry] = await db
      .select()
      .from(queueEntries)
      .orderBy(desc(queueEntries.queueNumber))
      .limit(1);

    const nextQueueNumber = (lastQueueEntry?.queueNumber || 0) + 1;

    try {
      const [patient] = await db.insert(patients).values(result.data).returning();
      const [entry] = await db
        .insert(queueEntries)
        .values({
          patientId: patient.id,
          queueNumber: nextQueueNumber,
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
        .set({ isPaid: true })
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
      const entries = await db
        .select()
        .from(queueEntries)
        .innerJoin(patients, eq(queueEntries.patientId, patients.id))
        .where(
          and(
            eq(queueEntries.isPaid, true),
            eq(queueEntries.status, "waiting")
          )
        )
        .orderBy(desc(queueEntries.createdAt));

      res.json(entries);
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

  return httpServer;
}