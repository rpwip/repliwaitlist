import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { db } from '@db';
import { queueEntries, clinics, doctors, users, patients } from '@db/schema';
import { eq } from 'drizzle-orm';

describe('Queue Management API', () => {
  let testClinic;
  let testPatient;
  let testDoctor;
  let authCookie;

  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(queueEntries);
    await db.delete(patients);
    await db.delete(doctors);
    await db.delete(clinics);
    await db.delete(users);

    // Create test clinic
    [testClinic] = await db
      .insert(clinics)
      .values({
        name: 'Test Clinic',
        address: 'Test Address',
        contactNumber: '1234567890',
        type: 'primary',
        isActive: true
      })
      .returning();

    // Create test doctor
    const [testUser] = await db
      .insert(users)
      .values({
        username: 'testdoctor',
        password: 'hashedpassword',
        isAdmin: false
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
        isActive: true
      })
      .returning();

    // Create test patient
    [testPatient] = await db
      .insert(patients)
      .values({
        fullName: 'Test Patient',
        email: 'test@example.com',
        mobile: '1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Other'
      })
      .returning();

    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testdoctor', password: 'hashedpassword' });
    
    authCookie = loginResponse.headers['set-cookie']?.[0];
  });

  describe('GET /api/queues/:clinicId', () => {
    it('returns empty queue when no patients are waiting', async () => {
      const response = await request(app)
        .get(`/api/queues/${testClinic.id}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns queue with waiting patients', async () => {
      await db.insert(queueEntries).values({
        patientId: testPatient.id,
        clinicId: testClinic.id,
        doctorId: testDoctor.id,
        queueNumber: 1,
        status: 'waiting',
        priority: 0
      });

      const response = await request(app)
        .get(`/api/queues/${testClinic.id}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        queueNumber: 1,
        status: 'waiting',
        patientName: testPatient.fullName
      });
    });
  });

  describe('POST /api/queues/entries', () => {
    it('creates a new queue entry', async () => {
      const response = await request(app)
        .post('/api/queues/entries')
        .set('Cookie', authCookie)
        .send({
          patientId: testPatient.id,
          clinicId: testClinic.id,
          doctorId: testDoctor.id
        })
        .expect(201);

      expect(response.body).toMatchObject({
        patientId: testPatient.id,
        clinicId: testClinic.id,
        doctorId: testDoctor.id,
        status: 'waiting'
      });
    });

    it('requires authentication', async () => {
      await request(app)
        .post('/api/queues/entries')
        .send({
          patientId: testPatient.id,
          clinicId: testClinic.id
        })
        .expect(401);
    });
  });

  describe('PATCH /api/queues/entries/:entryId', () => {
    it('updates queue entry status', async () => {
      const [entry] = await db
        .insert(queueEntries)
        .values({
          patientId: testPatient.id,
          clinicId: testClinic.id,
          doctorId: testDoctor.id,
          queueNumber: 1,
          status: 'waiting',
          priority: 0
        })
        .returning();

      const response = await request(app)
        .patch(`/api/queues/entries/${entry.id}`)
        .set('Cookie', authCookie)
        .send({ status: 'in-progress' })
        .expect(200);

      expect(response.body.status).toBe('in-progress');
    });
  });
});
