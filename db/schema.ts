import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

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

// Pharmacy management
export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  email: text("email").notNull(),
  isCloudCares: boolean("is_cloud_cares").default(false),
  deliveryAvailable: boolean("delivery_available").default(true),
  operatingHours: jsonb("operating_hours"),
  isVerified: boolean("is_verified").default(false),
});

// Prescription management
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  visitRecordId: integer("visit_record_id").references(() => visitRecords.id),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  medications: jsonb("medications").notNull(), // Array of medication details
  instructions: text("instructions"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  sharedWithPharmacy: boolean("shared_with_pharmacy").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: boolean("email").default(true),
  sms: boolean("sms").default(true),
  queueUpdates: boolean("queue_updates").default(true),
  appointmentReminders: boolean("appointment_reminders").default(true),
  prescriptionUpdates: boolean("prescription_updates").default(true),
  marketingUpdates: boolean("marketing_updates").default(false),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  doctors: many(doctors),
  notificationPreferences: many(notificationPreferences),
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
  prescriptions: many(prescriptions),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  clinicAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
  prescriptions: many(prescriptions),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  doctorAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
}));

// Add other necessary relations and schemas...

// Create Zod schemas for all tables
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
// Add other schemas...

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
// Add other types...