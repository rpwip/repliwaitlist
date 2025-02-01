import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  queueNumber: integer("queue_number").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, in-progress, completed
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const patientsRelations = relations(patients, ({ many }) => ({
  queueEntries: many(queueEntries),
}));

export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [queueEntries.patientId],
    references: [patients.id],
  }),
}));

// Schema validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertQueueEntrySchema = createInsertSchema(queueEntries);
export const selectQueueEntrySchema = createSelectSchema(queueEntries);

// Types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type SelectPatient = typeof patients.$inferSelect;
export type InsertQueueEntry = typeof queueEntries.$inferInsert;
export type SelectQueueEntry = typeof queueEntries.$inferSelect;
