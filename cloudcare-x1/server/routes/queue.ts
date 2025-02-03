import { eq } from "drizzle-orm";
import { db } from "@db";
import { queueEntries, patients, clinics, doctors } from "@db/schema";
import type { SelectQueueEntry } from "@db/schema";

const AVERAGE_CONSULTATION_TIME = 15; // minutes

export async function getClinicQueue(clinicId: number) {
  try {
    const entries = await db.query.queueEntries.findMany({
      where: eq(queueEntries.clinicId, clinicId),
      with: {
        patient: true,
        clinic: true,
        doctor: true
      },
      orderBy: (qe) => [qe.priority, qe.queueNumber]
    });

    // Calculate estimated wait times
    const formattedEntries = entries.map((entry, index) => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      status: entry.status,
      patientName: entry.patient.fullName,
      patientId: entry.patientId,
      estimatedWaitTime: calculateWaitTime(index),
      doctorName: entry.doctor?.fullName,
      clinicId: entry.clinicId,
      clinicName: entry.clinic.name,
      priority: entry.priority
    }));

    return formattedEntries;
  } catch (error) {
    console.error('Error fetching clinic queue:', error);
    throw error;
  }
}

export async function createQueueEntry(clinicId: number, patientId: number, doctorId: number) {
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
        doctorId,
        queueNumber: nextQueueNumber,
        status: "waiting",
        priority: 0
      })
      .returning();

    return newEntry;
  } catch (error) {
    console.error('Error creating queue entry:', error);
    throw error;
  }
}

export async function updateQueueEntry(
  entryId: number,
  data: Partial<SelectQueueEntry>
): Promise<SelectQueueEntry> {
  const validStatuses = ["waiting", "in-progress", "completed", "cancelled"];
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  try {
    const [updatedEntry] = await db
      .update(queueEntries)
      .set(data)
      .where(eq(queueEntries.id, entryId))
      .returning();

    if (!updatedEntry) {
      throw new Error("Queue entry not found");
    }

    return updatedEntry;
  } catch (error) {
    console.error('Error updating queue entry:', error);
    throw error;
  }
}

function calculateWaitTime(queuePosition: number): number {
  return (queuePosition + 1) * AVERAGE_CONSULTATION_TIME;
}
