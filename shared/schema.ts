import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains the same as it might be used elsewhere
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New action schema for the action recorder
export const recordedActionSchema = z.object({
  type: z.enum(['click', 'type', 'capture']),
  timestamp: z.string(),
  // For click actions
  coordinates: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  // For click actions
  element: z.object({
    id: z.string().optional(),
    text: z.string().optional(),
    tagName: z.string().optional()
  }).optional(),
  // For type actions
  text: z.string().optional(),
  // For capture actions
  content: z.string().optional(),
  // AI-generated description
  description: z.string().optional(),
});

export type RecordedAction = z.infer<typeof recordedActionSchema>;

export const exportDataSchema = z.object({
  timestamp: z.string(),
  actions: z.array(recordedActionSchema)
});

export type ExportData = z.infer<typeof exportDataSchema>;

// Database schema for persisting recordings
export const recordingSessions = pgTable("recording_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Store the entire recording data as JSON
  actions: jsonb("actions").notNull(),
  // Additional metadata
  actionsCount: integer("actions_count").notNull(),
  hasCaptures: boolean("has_captures").default(false),
  isShared: boolean("is_shared").default(false),
  shareUrl: text("share_url"),
});

// Create the insert schema for recording sessions
export const insertRecordingSessionSchema = createInsertSchema(recordingSessions)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // We need to validate the actions as an array of RecordedAction
    actions: z.array(recordedActionSchema),
  });

// Create a schema for updating recording sessions
export const updateRecordingSessionSchema = createInsertSchema(recordingSessions)
  .omit({ id: true, createdAt: true })
  .partial()
  .extend({
    actions: z.array(recordedActionSchema).optional(),
  });

export type RecordingSession = typeof recordingSessions.$inferSelect;
export type InsertRecordingSession = z.infer<typeof insertRecordingSessionSchema>;
export type UpdateRecordingSession = z.infer<typeof updateRecordingSessionSchema>;
