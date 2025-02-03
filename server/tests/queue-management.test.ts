import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { setupTestPatient, cleanupDatabase } from './setup';
import { db } from '@db';
import { queueEntries, clinics, doctors, users } from '@db/schema';
import { eq } from 'drizzle-orm';

describe('Queue Management API', () => {
  let testPatient: any;
  let testClinic: any;
  let testDoctor: any;
  let authCookie: string;

  beforeEach(async () => {
    await cleanupDatabase();

    // Create test data
    testPatient = await setupTestPatient();

    // Create test clinic
    [testClinic] = await db
      .insert(clinics)
      .values({
        name: 'Test Clinic',
        address: 'Test Address',
        type: 'General',
        contactNumber: '1234567890',
      })
      .returning();

    // Create test doctor user
    const [testUser] = await db
      .insert(users)
      .values({
        username: 'testdoctor',
        password: 'hashedpassword', // In real tests, this would be properly hashed
      })
      .returning();

    [testDoctor] = await db
      .insert(doctors)
      .values({
        userId: testUser.id,
        fullName: 'Dr. Test',
        specialization: 'General',
        qualifications: 'MBBS',
        contactNumber: '0987654321',
      })
      .returning();

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username: 'testdoctor', password: 'hashedpassword' });

    authCookie = loginResponse.headers['set-cookie']?.[0] ?? '';
  });

  describe('GET /api/queue', () => {
    it('returns empty queue when no patients are waiting', async () => {
      const response = await request(app)
        .get('/api/queue')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns queue with waiting patients', async () => {
      // Add patient to queue
      await db.insert(queueEntries).values({
        patientId: testPatient.id,
        queueNumber: 1,
        status: 'waiting',
        clinicId: testClinic.id,
        isPaid: true,
      });

      const response = await request(app)
        .get('/api/queue')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        queueNumber: 1,
        status: 'waiting',
        patient: {
          fullName: testPatient.fullName,
        },
      });
    });

    it('includes estimated wait times', async () => {
      // Add multiple patients to queue
      await db.insert(queueEntries).values([
        {
          patientId: testPatient.id,
          queueNumber: 1,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
        },
        {
          patientId: testPatient.id,
          queueNumber: 2,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
        },
      ]);

      const response = await request(app)
        .get('/api/queue')
        .expect(200);

      expect(response.body[0].estimatedWaitTime).toBeDefined();
      expect(response.body[1].estimatedWaitTime).toBeGreaterThan(response.body[0].estimatedWaitTime);
    });
  });

  describe('POST /api/queue/:queueId/status', () => {
    it('requires authentication', async () => {
      await request(app)
        .post('/api/queue/1/status')
        .send({ status: 'in-progress' })
        .expect(401);
    });

    it('updates queue entry status', async () => {
      // Add patient to queue
      const [queueEntry] = await db
        .insert(queueEntries)
        .values({
          patientId: testPatient.id,
          queueNumber: 1,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
        })
        .returning();

      const response = await request(app)
        .post(`/api/queue/${queueEntry.id}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'in-progress' })
        .expect(200);

      expect(response.body.status).toBe('in-progress');

      // Verify database update
      const [updatedEntry] = await db
        .select()
        .from(queueEntries)
        .where(eq(queueEntries.id, queueEntry.id));

      expect(updatedEntry.status).toBe('in-progress');
    });

    it('returns 404 for non-existent queue entry', async () => {
      await request(app)
        .post('/api/queue/999/status')
        .set('Cookie', authCookie)
        .send({ status: 'in-progress' })
        .expect(404);
    });

    it('validates status value', async () => {
      const [queueEntry] = await db
        .insert(queueEntries)
        .values({
          patientId: testPatient.id,
          queueNumber: 1,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
        })
        .returning();

      await request(app)
        .post(`/api/queue/${queueEntry.id}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'invalid-status' })
        .expect(400);
    });
  });
});