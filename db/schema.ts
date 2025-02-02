import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Core user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  contactNumber: text("contact_number"),
  email: text("email"),
  role: text("role").notNull(), // admin, doctor, clinic_staff, patient
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient management
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email"),
  mobile: text("mobile"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
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
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Doctor metrics for analytics
export const doctorMetrics = pgTable("doctor_metrics", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  date: date("date").notNull(),
  patientsCount: integer("patients_count").default(0),
  newPatientsCount: integer("new_patients_count").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
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
  queueNumber: integer("queue_number").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, in-progress, completed, cancelled
  estimatedTime: integer("estimated_time"), // in minutes
  priority: integer("priority").default(0),
  checkInTime: timestamp("check_in_time").defaultNow(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  notificationSent: boolean("notification_sent").default(false),
  visitReason: text("visit_reason"),
  vitals: jsonb("vitals"), // temperature, bp, etc
});

// Define types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type SelectUser = User;

export type Patient = InferSelectModel<typeof patients>;
export type NewPatient = InferInsertModel<typeof patients>;
export type SelectPatient = Patient;

export type Doctor = InferSelectModel<typeof doctors>;
export type NewDoctor = InferInsertModel<typeof doctors>;
export type SelectDoctor = Doctor;

export type DoctorMetrics = InferSelectModel<typeof doctorMetrics>;
export type NewDoctorMetrics = InferInsertModel<typeof doctorMetrics>;
export type SelectDoctorMetrics = DoctorMetrics;

export type Clinic = InferSelectModel<typeof clinics>;
export type NewClinic = InferInsertModel<typeof clinics>;
export type SelectClinic = Clinic;

export type DoctorClinicAssignment = InferSelectModel<typeof doctorClinicAssignments>;
export type NewDoctorClinicAssignment = InferInsertModel<typeof doctorClinicAssignments>;
export type SelectDoctorClinicAssignment = DoctorClinicAssignment;

export type QueueEntry = InferSelectModel<typeof queueEntries>;
export type NewQueueEntry = InferInsertModel<typeof queueEntries>;

// Export schemas
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

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  doctor: one(doctors, {
    fields: [users.id],
    references: [doctors.userId],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  queueEntries: many(queueEntries),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  metrics: many(doctorMetrics),
  clinicAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  doctorAssignments: many(doctorClinicAssignments),
  queueEntries: many(queueEntries),
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
}));