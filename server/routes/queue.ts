import { eq } from "drizzle-orm";
import { db } from "@db";
import { queueEntries, patients } from "@db/schema";

export async function getClinicQueue(clinicId: number) {
  console.log('Fetching queue entries for clinic', clinicId);
  try {
    const entries = await db.query.queueEntries.findMany({
      where: eq(queueEntries.clinicId, clinicId),
      with: {
        patient: true
      },
      orderBy: (qe) => [qe.queueNumber]
    });

    console.log(`Found ${entries.length} entries for clinic ${clinicId}`);

    // Format the queue entries with required fields
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      status: entry.status,
      fullName: entry.patient.fullName,
      patientId: entry.patientId,
      estimatedWaitTime: entry.estimatedWaitTime,
      clinicId: entry.clinicId,
      createdAt: entry.createdAt
    }));

    console.log('Formatted entries:', formattedEntries);
    return formattedEntries;
  } catch (error) {
    console.error('Error fetching clinic queue:', error);
    throw error;
  }
}
