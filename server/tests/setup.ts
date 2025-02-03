import { beforeEach, afterAll } from '@jest/globals';
import { db } from '@db';
import { patients, queueEntries } from '@db/schema';

export async function cleanupDatabase() {
  await db.delete(queueEntries);
  await db.delete(patients);
}

export async function setupTestPatient() {
  const [patient] = await db
    .insert(patients)
    .values({
      fullName: 'Test Patient',
      mobile: '1234567890',
      email: 'test@example.com',
    })
    .returning();

  return patient;
}

beforeEach(async () => {
  await cleanupDatabase();
});

afterAll(async () => {
  await cleanupDatabase();
});
