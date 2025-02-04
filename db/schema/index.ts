import { relations } from 'drizzle-orm';
import {
  serial,
  varchar,
  text,
  timestamp,
  pgTable,
  integer,
  pgSchema,
  index,
} from 'drizzle-orm/pg-core';

// Create schema
const cloudcaresch = pgSchema('cloudcaresch');

// Users table
export const users = cloudcaresch.table('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));

// Patients table
export const patients = cloudcaresch.table('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  age: integer('age'),
  gender: varchar('gender', { length: 50 }),
  address: text('address'),
}, (table) => ({
  nameIdx: index('patient_name_idx').on(table.name),
  userIdx: index('patient_user_idx').on(table.userId),
}));

// Clinics table
export const clinics = cloudcaresch.table('clinics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
}, (table) => ({
  nameIdx: index('clinic_name_idx').on(table.name),
}));

// Doctors table
export const doctors = cloudcaresch.table('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  specialization: varchar('specialization', { length: 255 }),
  clinicId: integer('clinic_id').references(() => clinics.id),
}, (table) => ({
  nameIdx: index('doctor_name_idx').on(table.name),
  specializationIdx: index('doctor_specialization_idx').on(table.specialization),
}));

// Pharmacies table
export const pharmacies = cloudcaresch.table('pharmacies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
}, (table) => ({
  nameIdx: index('pharmacy_name_idx').on(table.name),
}));

// Visit Records table
export const visitRecords = cloudcaresch.table('visit_records', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  clinicId: integer('clinic_id').notNull().references(() => clinics.id),
  visitDate: timestamp('visit_date').notNull(),
  diagnosis: text('diagnosis'),
  prescription: text('prescription'),
}, (table) => ({
  patientIdx: index('visit_patient_idx').on(table.patientId),
  doctorIdx: index('visit_doctor_idx').on(table.doctorId),
  dateIdx: index('visit_date_idx').on(table.visitDate),
}));

// Medications table
export const medications = cloudcaresch.table('medications', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().references(() => visitRecords.id, { onDelete: 'cascade' }),
  medicationName: varchar('medication_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(),
  beforeOrAfterMeal: varchar('before_or_after_meal', { length: 50 }),
}, (table) => ({
  visitIdx: index('medication_visit_idx').on(table.visitId),
  nameIdx: index('medication_name_idx').on(table.medicationName),
}));

// Diagnoses table
export const diagnoses = cloudcaresch.table('diagnoses', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  diagnosis: text('diagnosis').notNull(),
  diagnosisDate: timestamp('diagnosis_date').notNull(),
}, (table) => ({
  patientIdx: index('diagnosis_patient_idx').on(table.patientId),
  dateIdx: index('diagnosis_date_idx').on(table.diagnosisDate),
}));

// Orders table
export const orders = cloudcaresch.table('orders', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  clinicId: integer('clinic_id').notNull().references(() => clinics.id),
  orderDate: timestamp('order_date').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
}, (table) => ({
  patientIdx: index('order_patient_idx').on(table.patientId),
  doctorIdx: index('order_doctor_idx').on(table.doctorId),
  dateIdx: index('order_date_idx').on(table.orderDate),
  statusIdx: index('order_status_idx').on(table.status),
}));

// Order Medications table
export const orderMedications = cloudcaresch.table('order_medications', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  medicationName: varchar('medication_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
}, (table) => ({
  orderIdx: index('order_medication_order_idx').on(table.orderId),
  statusIdx: index('order_medication_status_idx').on(table.status),
}));

// Queue Entries table
export const queueEntries = cloudcaresch.table('queue_entries', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  clinicId: integer('clinic_id').notNull().references(() => clinics.id),
  entryTime: timestamp('entry_time').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  priority: integer('priority').default(0),
}, (table) => ({
  patientIdx: index('queue_patient_idx').on(table.patientId),
  doctorIdx: index('queue_doctor_idx').on(table.doctorId),
  statusIdx: index('queue_status_idx').on(table.status),
  timeIdx: index('queue_time_idx').on(table.entryTime),
}));

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  doctors: many(doctors),
  clinics: many(clinics),
  pharmacies: many(pharmacies),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  visitRecords: many(visitRecords),
  diagnoses: many(diagnoses),
  orders: many(orders),
  queueEntries: many(queueEntries),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [doctors.clinicId],
    references: [clinics.id],
  }),
  visitRecords: many(visitRecords),
  orders: many(orders),
  queueEntries: many(queueEntries),
}));

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  user: one(users, {
    fields: [clinics.userId],
    references: [users.id],
  }),
  doctors: many(doctors),
  visitRecords: many(visitRecords),
  orders: many(orders),
  queueEntries: many(queueEntries),
}));

export const visitRecordsRelations = relations(visitRecords, ({ one, many }) => ({
  patient: one(patients, {
    fields: [visitRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [visitRecords.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [visitRecords.clinicId],
    references: [clinics.id],
  }),
  medications: many(medications),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [orders.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [orders.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [orders.clinicId],
    references: [clinics.id],
  }),
  orderMedications: many(orderMedications),
}));