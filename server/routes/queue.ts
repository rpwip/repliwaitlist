import { eq } from "drizzle-orm";
import { db } from "@db";
import { queueEntries, patients, clinics } from "@db/schema";
import type { SelectQueueEntry } from "@db/schema";

const AVERAGE_CONSULTATION_TIME = 15; // minutes

export async function getClinicQueue(clinicId: number) {
  try {
    const entries = await db.query.queueEntries.findMany({
      where: eq(queueEntries.clinicId, clinicId),
      with: {
        patient: true,
        clinic: true,
      },
      orderBy: (qe) => [qe.priority, qe.queueNumber],
    });

    // Calculate estimated wait times based on queue position
    const formattedEntries = entries.map((entry, index) => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      status: entry.status,
      patientName: entry.patient.fullName,
      patientId: entry.patientId,
      estimatedWaitTime: calculateWaitTime(index),
      clinicId: entry.clinicId,
      clinicName: entry.clinic.name,
      priority: entry.priority,
      createdAt: entry.createdAt,
    }));

    return formattedEntries;
  } catch (error) {
    console.error('Error fetching clinic queue:', error);
    throw error;
  }
}

export async function createQueueEntry(clinicId: number, patientId: number) {
  try {
    // Get the latest queue number for this clinic
    const [lastEntry] = await db
      .select()
      .from(queueEntries)
      .where(eq(queueEntries.clinicId, clinicId))
      .orderBy((qe) => qe.queueNumber, "desc")
      .limit(1);

    const nextQueueNumber = (lastEntry?.queueNumber ?? 0) + 1;

    const [newEntry] = await db
      .insert(queueEntries)
      .values({
        clinicId,
        patientId,
        queueNumber: nextQueueNumber,
        status: "waiting",
        priority: 0,
        isPaid: false,
      })
      .returning();

    return newEntry;
  } catch (error) {
    console.error('Error creating queue entry:', error);
    throw error;
  }
}

export async function updateQueueEntryStatus(
  entryId: number,
  status: string
): Promise<SelectQueueEntry> {
  const validStatuses = ["waiting", "in-progress", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  try {
    const [updatedEntry] = await db
      .update(queueEntries)
      .set({ status })
      .where(eq(queueEntries.id, entryId))
      .returning();

    if (!updatedEntry) {
      throw new Error("Queue entry not found");
    }

    return updatedEntry;
  } catch (error) {
    console.error('Error updating queue entry status:', error);
    throw error;
  }
}

function calculateWaitTime(queuePosition: number): number {
  return (queuePosition + 1) * AVERAGE_CONSULTATION_TIME;
}