import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { setupTestPatient, cleanupDatabase } from './setup';
import { db } from '@db';
import { queueEntries, clinics, doctors, users, patients } from '@db/schema';
import { eq } from 'drizzle-orm';

describe('Queue Management API', () => {
  let testPatient: any;
  let testClinic: any;
  let testDoctor: any;
  let authCookie: string;

  beforeEach(async () => {
    await cleanupDatabase();

    // Create test clinic
    [testClinic] = await db
      .insert(clinics)
      .values({
        name: 'Cloud Care Test Clinic',
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
        password: 'hashedpassword',
        isAdmin: false,
      })
      .returning();

    // Create test doctor
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

    // Create test patient
    [testPatient] = await db
      .insert(patients)
      .values({
        fullName: 'Test Patient',
        email: 'test@patient.com',
        mobile: '1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Other',
      })
      .returning();

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username: 'testdoctor', password: 'hashedpassword' });

    authCookie = loginResponse.headers['set-cookie']?.[0] ?? '';
  });

  describe('GET /api/queues/:clinicId', () => {
    it('returns empty queue when no patients are waiting', async () => {
      const response = await request(app)
        .get(`/api/queues/${testClinic.id}`)
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
        priority: 0,
      });

      const response = await request(app)
        .get(`/api/queues/${testClinic.id}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        queueNumber: 1,
        status: 'waiting',
        patientName: testPatient.fullName,
        estimatedWaitTime: expect.any(Number),
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
          priority: 0,
        },
        {
          patientId: testPatient.id,
          queueNumber: 2,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
          priority: 0,
        },
      ]);

      const response = await request(app)
        .get(`/api/queues/${testClinic.id}`)
        .expect(200);

      expect(response.body[0].estimatedWaitTime).toBeDefined();
      expect(response.body[1].estimatedWaitTime).toBeGreaterThan(response.body[0].estimatedWaitTime);
    });
  });

  describe('POST /api/queues/:clinicId/entries', () => {
    it('requires authentication', async () => {
      await request(app)
        .post(`/api/queues/${testClinic.id}/entries`)
        .send({ patientId: testPatient.id })
        .expect(401);
    });

    it('creates a new queue entry', async () => {
      const response = await request(app)
        .post(`/api/queues/${testClinic.id}/entries`)
        .set('Cookie', authCookie)
        .send({ patientId: testPatient.id })
        .expect(201);

      expect(response.body).toMatchObject({
        queueNumber: expect.any(Number),
        status: 'waiting',
        patientId: testPatient.id,
        clinicId: testClinic.id,
      });
    });
  });

  describe('PATCH /api/queues/entries/:entryId/status', () => {
    it('requires authentication', async () => {
      await request(app)
        .patch('/api/queues/entries/1/status')
        .send({ status: 'in-progress' })
        .expect(401);
    });

    it('updates queue entry status', async () => {
      const [queueEntry] = await db
        .insert(queueEntries)
        .values({
          patientId: testPatient.id,
          queueNumber: 1,
          status: 'waiting',
          clinicId: testClinic.id,
          isPaid: true,
          priority: 0,
        })
        .returning();

      const response = await request(app)
        .patch(`/api/queues/entries/${queueEntry.id}/status`)
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
  });
});