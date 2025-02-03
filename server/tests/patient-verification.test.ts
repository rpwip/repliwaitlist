import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { setupTestPatient, cleanupDatabase } from './setup';
import { db } from '@db';
import { queueEntries } from '@db/schema';

describe('Patient Verification API', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('returns 400 when mobile number is missing', async () => {
    const response = await request(app)
      .get('/api/patient/profile')
      .expect(400);

    expect(response.text).toBe('Mobile number is required');
  });

  it('returns 404 when patient is not found', async () => {
    const response = await request(app)
      .get('/api/patient/profile?mobile=9999999999')
      .expect(404);

    expect(response.text).toBe('Patient not found');
  });

  it('returns patient data when found', async () => {
    const testPatient = await setupTestPatient();

    const response = await request(app)
      .get('/api/patient/profile?mobile=1234567890')
      .expect(200);

    expect(response.body).toMatchObject({
      id: testPatient.id,
      fullName: testPatient.fullName,
      mobile: testPatient.mobile,
    });
  });

  it('handles special characters in mobile number', async () => {
    await setupTestPatient();

    const response = await request(app)
      .get('/api/patient/profile?mobile=+91-123-456-7890')
      .expect(200);

    expect(response.body.mobile).toBe('1234567890');
  });

  it('includes active queue entry if patient is in queue', async () => {
    const testPatient = await setupTestPatient();

    // Add patient to queue
    await db
      .insert(queueEntries)
      .values({
        patientId: testPatient.id,
        queueNumber: 1,
        status: 'waiting',
        clinicId: 1,
        isPaid: true
      });

    const response = await request(app)
      .get('/api/patient/profile?mobile=1234567890')
      .expect(200);

    expect(response.body.queueEntry).toBeDefined();
    expect(response.body.queueEntry.status).toBe('waiting');
  });
});