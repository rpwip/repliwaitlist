import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
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

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  specialization: text("specialization").notNull(),
  qualifications: text("qualifications").notNull(),
  contactNumber: text("contact_number").notNull(),
  availability: jsonb("availability"),  // Store weekly schedule
});

export const patientDoctorAssignments = pgTable("patient_doctor_assignments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isPrimary: boolean("is_primary").default(false),
});

export const diagnoses = pgTable("diagnoses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  condition: text("condition").notNull(),
  notes: text("notes"),
  diagnosedAt: timestamp("diagnosed_at").defaultNow(),
  status: text("status").default("active"), // active, resolved, monitoring
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  diagnosisId: integer("diagnosis_id").references(() => diagnoses.id),
  medications: jsonb("medications").notNull(), // Array of medication details
  instructions: text("instructions"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  type: text("type").notNull(), // regular, followup, emergency
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitRecords = pgTable("visit_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpDate: date("follow_up_date"),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  amount: integer("amount").notNull(),
  paymentMode: text("payment_mode").notNull(), // upi, card, netbanking
  transactionId: text("transaction_id"),
  status: text("status").default("pending"), // pending, completed, failed
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  queueNumber: integer("queue_number").notNull(),
  priority: integer("priority").default(0),
  status: text("status").notNull().default("waiting"),
  isPaid: boolean("is_paid").default(false),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  isCloudCares: boolean("is_cloud_cares").default(false),
  deliveryAvailable: boolean("delivery_available").default(true),
});

export const medicineOrders = pgTable("medicine_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  status: text("status").notNull().default("pending"), // pending, approved, ready_for_pickup, delivered
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  deliveryMethod: text("delivery_method"), // pickup, delivery
  paymentStatus: text("payment_status").default("pending"), // pending, paid
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const patientPreferences = pgTable("patient_preferences", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  preferredPharmacyId: integer("preferred_pharmacy_id").references(() => pharmacies.id),
  primaryDoctorId: integer("primary_doctor_id").references(() => doctors.id),
    preferredClinicId: integer("preferred_clinic_id").references(() => clinics.id),
  notificationPreferences: jsonb("notification_preferences"),
});

export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  type: text("type").notNull(), // primary, specialist, hospital
});


export const patientsRelations = relations(patients, ({ many }) => ({
  queueEntries: many(queueEntries),
  diagnoses: many(diagnoses),
  prescriptions: many(prescriptions),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
  doctorAssignments: many(patientDoctorAssignments),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  patientAssignments: many(patientDoctorAssignments),
  diagnoses: many(diagnoses),
  prescriptions: many(prescriptions),
  appointments: many(appointments),
  visitRecords: many(visitRecords),
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
  visitRecord: many(visitRecords),
  queueEntry: many(queueEntries),
  payment: many(payments),
}));

export const pharmaciesRelations = relations(pharmacies, ({ many }) => ({
  medicineOrders: many(medicineOrders),
}));

export const medicineOrdersRelations = relations(medicineOrders, ({ one }) => ({
  patient: one(patients, {
    fields: [medicineOrders.patientId],
    references: [patients.id],
  }),
  pharmacy: one(pharmacies, {
    fields: [medicineOrders.pharmacyId],
    references: [pharmacies.id],
  }),
  prescription: one(prescriptions, {
    fields: [medicineOrders.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const patientPreferencesRelations = relations(patientPreferences, ({ one }) => ({
  patient: one(patients, {
    fields: [patientPreferences.patientId],
    references: [patients.id],
  }),
  preferredPharmacy: one(pharmacies, {
    fields: [patientPreferences.preferredPharmacyId],
    references: [pharmacies.id],
  }),
  primaryDoctor: one(doctors, {
    fields: [patientPreferences.primaryDoctorId],
    references: [doctors.id],
  }),
  preferredClinic: one(clinics, {
    fields: [patientPreferences.preferredClinicId],
    references: [clinics.id],
  }),
}));


export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertDoctorSchema = createInsertSchema(doctors);
export const selectDoctorSchema = createSelectSchema(doctors);

export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);

export const insertPrescriptionSchema = createInsertSchema(prescriptions);
export const selectPrescriptionSchema = createSelectSchema(prescriptions);

export const insertDiagnosisSchema = createInsertSchema(diagnoses);
export const selectDiagnosisSchema = createSelectSchema(diagnoses);

export const insertVisitRecordSchema = createInsertSchema(visitRecords);
export const selectVisitRecordSchema = createSelectSchema(visitRecords);

export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);

export const insertQueueEntrySchema = createInsertSchema(queueEntries);
export const selectQueueEntrySchema = createSelectSchema(queueEntries);

export const insertPharmacySchema = createInsertSchema(pharmacies);
export const selectPharmacySchema = createSelectSchema(pharmacies);

export const insertMedicineOrderSchema = createInsertSchema(medicineOrders);
export const selectMedicineOrderSchema = createSelectSchema(medicineOrders);

export const insertPatientPreferencesSchema = createInsertSchema(patientPreferences);
export const selectPatientPreferencesSchema = createSelectSchema(patientPreferences);

export const insertClinicSchema = createInsertSchema(clinics);
export const selectClinicSchema = createSelectSchema(clinics);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type SelectPatient = typeof patients.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;
export type SelectDoctor = typeof doctors.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type SelectAppointment = typeof appointments.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;
export type SelectPrescription = typeof prescriptions.$inferSelect;
export type InsertDiagnosis = typeof diagnoses.$inferInsert;
export type SelectDiagnosis = typeof diagnoses.$inferSelect;
export type InsertVisitRecord = typeof visitRecords.$inferInsert;
export type SelectVisitRecord = typeof visitRecords.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type SelectPayment = typeof payments.$inferSelect;
export type InsertQueueEntry = typeof queueEntries.$inferInsert;
export type SelectQueueEntry = typeof queueEntries.$inferSelect;
export type InsertPharmacy = typeof pharmacies.$inferInsert;
export type SelectPharmacy = typeof pharmacies.$inferSelect;
export type InsertMedicineOrder = typeof medicineOrders.$inferInsert;
export type SelectMedicineOrder = typeof medicineOrders.$inferSelect;
export type InsertPatientPreferences = typeof patientPreferences.$inferInsert;
export type SelectPatientPreferences = typeof patientPreferences.$inferSelect;
export type InsertClinic = typeof clinics.$inferInsert;
export type SelectClinic = typeof clinics.$inferSelect;