
import { eq, and } from "drizzle-orm";
import { db } from "@db";
import { queueEntries, patients, doctors, doctorClinicAssignments } from "@db/schema";

export async function getClinicQueue(clinicId: number) {
  console.log('Fetching queue entries for clinic', clinicId);
  try {
    console.log('[DB Query] Starting queue fetch for clinic:', clinicId);
    console.log('[DB Query] Query parameters:', { clinicId });
    const entries = await db.query.queueEntries.findMany({
      where: eq(queueEntries.clinicId, clinicId),
      with: {
        patient: true,
        clinic: true
      },
      orderBy: (qe) => [qe.queueNumber]
    });

    console.log(`Found ${entries.length} entries for clinic ${clinicId}`);

    // Format the queue entries with required fields
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      status: entry.status,
      patientId: entry.patientId,
      patient: {
        id: entry.patient.id,
        fullName: entry.patient.fullName,
      },
      estimatedWaitTime: entry.estimatedWaitTime,
      clinicId: entry.clinicId,
      createdAt: entry.createdAt,
      vitals: entry.vitals,
      visitReason: entry.visitReason
    }));

    console.log('Formatted entries:', formattedEntries);
    return formattedEntries;
  } catch (error) {
    console.error('Error fetching clinic queue:', error);
    throw error;
  }
}
