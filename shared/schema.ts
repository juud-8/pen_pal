import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  content: z.string().optional()
});

export type RecordedAction = z.infer<typeof recordedActionSchema>;

export const exportDataSchema = z.object({
  timestamp: z.string(),
  actions: z.array(recordedActionSchema)
});

export type ExportData = z.infer<typeof exportDataSchema>;
