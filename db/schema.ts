import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type { PgTableFn } from "drizzle-orm/pg-core";

// Core user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  phoneNumber: text("phone_number"),
  email: text("email"),
  role: text("role").notNull(), // admin, doctor, clinic_staff, patient
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient management
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  primaryPatientId: integer("primary_patient_id").references(() => patients.id), // For family members
  relationToPrimary: text("relation_to_primary"), // spouse, child, parent etc
  registeredAt: timestamp("registered_at").defaultNow(),
});

// Doctor management
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  specialization: text("specialization").notNull(),
  qualifications: text("qualifications").notNull(),
  contactNumber: text("contact_number").notNull(),
  registrationNumber: text("registration_number").notNull(),
  availability: jsonb("availability"), // Store weekly schedule
  isVerified: boolean("is_verified").default(false),
});

// Doctor metrics for analytics
export const doctorMetrics = pgTable("doctor_metrics", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  date: date("date").notNull(),
  patientsCount: integer("patients_count").default(0),
  newPatientsCount: integer("new_patients_count").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
  prescriptionsCount: integer("prescriptions_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
});

// Clinic management
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  email: text("email").notNull(),
  type: text("type").notNull(), // primary, specialist, hospital
  isVerified: boolean("is_verified").default(false),
  qrCodeEnabled: boolean("qr_code_enabled").default(false),
  registrationNumber: text("registration_number"),
  operatingHours: jsonb("operating_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Doctor-Clinic relationship
export const doctorClinicAssignments = pgTable("doctor_clinic_assignments", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  schedule: jsonb("schedule"), // Weekly schedule at this clinic
  isActive: boolean("is_active").default(true),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
});

// Appointment management
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  type: text("type").notNull(), // regular, followup, emergency
  status: text("status").default("scheduled"), // scheduled, confirmed, completed, cancelled, no-show
  notes: text("notes"),
  paymentStatus: text("payment_status").default("pending"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Queue management
export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  queueNumber: integer("queue_number").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, in-progress, completed, cancelled, no-show
  estimatedTime: integer("estimated_time"), // in minutes
  priority: integer("priority").default(0),
  checkInTime: timestamp("check_in_time").defaultNow(),
  startTime: timestamp("start_time"), // When doctor starts consultation
  endTime: timestamp("end_time"), // When consultation ends
  paymentStatus: text("payment_status").default("pending"), // pending, completed, refunded
  paymentMethod: text("payment_method"), // qr, cash, card
  notificationSent: boolean("notification_sent").default(false),
  visitReason: text("visit_reason"),
  vitals: jsonb("vitals"), // temperature, bp, etc
});

// Visit records
export const visitRecords = pgTable("visit_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  queueEntryId: integer("queue_entry_id").references(() => queueEntries.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  notes: text("notes"),
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpDate: date("follow_up_date"),
  attachments: jsonb("attachments"), // Array of file references
  visitedAt: timestamp("visited_at").defaultNow(),
});

// Define types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type SelectUser = User;  // Add this export for auth.ts

export type Patient = InferSelectModel<typeof patients>;
export type NewPatient = InferInsertModel<typeof patients>;

export type Doctor = InferSelectModel<typeof doctors>;
export type NewDoctor = InferInsertModel<typeof doctors>;

export type DoctorMetrics = InferSelectModel<typeof doctorMetrics>;
export type NewDoctorMetrics = InferInsertModel<typeof doctorMetrics>;

export type Clinic = InferSelectModel<typeof clinics>;
export type NewClinic = InferInsertModel<typeof clinics>;

export type DoctorClinicAssignment = InferSelectModel<typeof doctorClinicAssignments>;
export type NewDoctorClinicAssignment = InferInsertModel<typeof doctorClinicAssignments>;

export type QueueEntry = InferSelectModel<typeof queueEntries>;
export type NewQueueEntry = InferInsertModel<typeof queueEntries>;

export type Appointment = InferSelectModel<typeof appointments>;
export type NewAppointment = InferInsertModel<typeof appointments>;

export type VisitRecord = InferSelectModel<typeof visitRecords>;
export type NewVisitRecord = InferInsertModel<typeof visitRecords>;

// Export Select types used in components
export type SelectPatient = Patient;
export type SelectDoctor = Doctor;
export type SelectDoctorMetrics = DoctorMetrics;
export type SelectDoctorClinicAssignment = DoctorClinicAssignment;
export type SelectClinic = Clinic;

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  doctors: many(doctors),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  primaryPatient: one(patients, {
    fields: [patients.primaryPatientId],
    references: [patients.id],
  }),
  queueEntries: many(queueEntries),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  metrics: many(doctorMetrics),
  clinicAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  doctorAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
}));

export const doctorMetricsRelations = relations(doctorMetrics, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorMetrics.doctorId],
    references: [doctors.id],
  }),
}));

export const doctorClinicAssignmentsRelations = relations(doctorClinicAssignments, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorClinicAssignments.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [doctorClinicAssignments.clinicId],
    references: [clinics.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [appointments.clinicId],
    references: [clinics.id],
  }),
  queueEntries: many(queueEntries),
  visitRecords: many(visitRecords),
}));

export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [queueEntries.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [queueEntries.doctorId],
    references: [doctors.id],
  }),
  clinic: one(clinics, {
    fields: [queueEntries.clinicId],
    references: [clinics.id],
  }),
  appointment: one(appointments, {
    fields: [queueEntries.appointmentId],
    references: [appointments.id],
  }),
}));

export const visitRecordsRelations = relations(visitRecords, ({ one }) => ({
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
  queueEntry: one(queueEntries, {
    fields: [visitRecords.queueEntryId],
    references: [queueEntries.id],
  }),
  appointment: one(appointments, {
    fields: [visitRecords.appointmentId],
    references: [appointments.id],
  }),
}));

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertDoctorSchema = createInsertSchema(doctors);
export const selectDoctorSchema = createSelectSchema(doctors);

export const insertClinicSchema = createInsertSchema(clinics);
export const selectClinicSchema = createSelectSchema(clinics);

export const insertQueueEntrySchema = createInsertSchema(queueEntries);
export const selectQueueEntrySchema = createSelectSchema(queueEntries);

export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);

export const insertVisitRecordSchema = createInsertSchema(visitRecords);
export const selectVisitRecordSchema = createSelectSchema(visitRecords);