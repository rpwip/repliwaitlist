import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Core tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  type: text("type").notNull(), // primary, specialist, hospital
  isActive: boolean("is_active").default(true),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  specialization: text("specialization").notNull(),
  qualifications: text("qualifications").notNull(),
  contactNumber: text("contact_number").notNull(),
  availability: jsonb("availability"), // Weekly schedule
  isActive: boolean("is_active").default(true),
});

// Queue Management
export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  queueNumber: integer("queue_number").notNull(),
  priority: integer("priority").default(0),
  status: text("status").notNull().default("waiting"), // waiting, in-progress, completed, cancelled
  estimatedWaitTime: integer("estimated_wait_time"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [queueEntries.patientId],
    references: [patients.id],
  }),
  clinic: one(clinics, {
    fields: [queueEntries.clinicId],
    references: [clinics.id],
  }),
  doctor: one(doctors, {
    fields: [queueEntries.doctorId],
    references: [doctors.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertClinicSchema = createInsertSchema(clinics);
export const selectClinicSchema = createSelectSchema(clinics);

export const insertDoctorSchema = createInsertSchema(doctors);
export const selectDoctorSchema = createSelectSchema(doctors);

export const insertQueueEntrySchema = createInsertSchema(queueEntries);
export const selectQueueEntrySchema = createSelectSchema(queueEntries);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;

export type QueueEntry = typeof queueEntries.$inferSelect;
export type NewQueueEntry = typeof queueEntries.$inferInsert;
