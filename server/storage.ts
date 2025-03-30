import { users, type User, type InsertUser, recordingSessions, type RecordingSession, type InsertRecordingSession, type UpdateRecordingSession, type RecordedAction } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

// Updated interface with recording session CRUD methods
export interface IStorage {
  // User methods remain for backward compatibility
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recording session methods
  getAllRecordingSessions(): Promise<RecordingSession[]>;
  getRecordingSessionById(id: string): Promise<RecordingSession | undefined>;
  createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession>;
  updateRecordingSession(id: string, data: UpdateRecordingSession): Promise<RecordingSession | undefined>;
  deleteRecordingSession(id: string): Promise<boolean>;
  getSharedRecordingSession(id: string): Promise<RecordingSession | undefined>;
  setRecordingSessionShared(id: string, isShared: boolean): Promise<RecordingSession | undefined>;
}

// Memory implementation for backward compatibility
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recordingSessions: Map<string, RecordingSession>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.recordingSessions = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Memory implementations of recording session methods
  async getAllRecordingSessions(): Promise<RecordingSession[]> {
    return Array.from(this.recordingSessions.values());
  }
  
  async getRecordingSessionById(id: string): Promise<RecordingSession | undefined> {
    return this.recordingSessions.get(id);
  }
  
  async createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    // Create a recording session with necessary fields
    const newSession: RecordingSession = {
      id,
      title: session.title,
      description: session.description || null,
      createdAt: now,
      updatedAt: now,
      actions: session.actions,
      actionsCount: session.actions.length,
      hasCaptures: session.actions.some(action => action.type === 'capture'),
      isShared: false,
      shareUrl: null,
    };
    
    this.recordingSessions.set(id, newSession);
    return newSession;
  }
  
  async updateRecordingSession(id: string, data: UpdateRecordingSession): Promise<RecordingSession | undefined> {
    const session = this.recordingSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: RecordingSession = {
      ...session,
      ...data,
      updatedAt: new Date(),
    };
    
    this.recordingSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async deleteRecordingSession(id: string): Promise<boolean> {
    return this.recordingSessions.delete(id);
  }
  
  async getSharedRecordingSession(id: string): Promise<RecordingSession | undefined> {
    const session = this.recordingSessions.get(id);
    if (session && session.isShared) {
      return session;
    }
    return undefined;
  }
  
  async setRecordingSessionShared(id: string, isShared: boolean): Promise<RecordingSession | undefined> {
    const session = this.recordingSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: RecordingSession = {
      ...session,
      isShared,
      shareUrl: isShared ? `/recording/${id}` : null,
      updatedAt: new Date(),
    };
    
    this.recordingSessions.set(id, updatedSession);
    return updatedSession;
  }
}

// Database implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Database implementations of recording session methods
  async getAllRecordingSessions(): Promise<RecordingSession[]> {
    return db.select().from(recordingSessions).orderBy(desc(recordingSessions.createdAt));
  }
  
  async getRecordingSessionById(id: string): Promise<RecordingSession | undefined> {
    const [session] = await db.select().from(recordingSessions).where(eq(recordingSessions.id, id));
    return session;
  }
  
  async createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession> {
    // Check if the actions have captures
    const hasCaptures = session.actions.some(action => action.type === 'capture');
    
    // Create the new recording session with metadata
    const [newSession] = await db
      .insert(recordingSessions)
      .values({
        ...session,
        hasCaptures,
        actionsCount: session.actions.length,
      })
      .returning();
    
    return newSession;
  }
  
  async updateRecordingSession(id: string, data: UpdateRecordingSession): Promise<RecordingSession | undefined> {
    // Update the actionsCount if actions are being updated
    const updateData: any = { 
      ...data,
      updatedAt: new Date()
    };
    
    if (data.actions) {
      updateData.actionsCount = data.actions.length;
      updateData.hasCaptures = data.actions.some((action: RecordedAction) => action.type === 'capture');
    }
    
    const [updatedSession] = await db
      .update(recordingSessions)
      .set(updateData)
      .where(eq(recordingSessions.id, id))
      .returning();
    
    return updatedSession;
  }
  
  async deleteRecordingSession(id: string): Promise<boolean> {
    const result = await db
      .delete(recordingSessions)
      .where(eq(recordingSessions.id, id))
      .returning({ id: recordingSessions.id });
    
    return result.length > 0;
  }
  
  async getSharedRecordingSession(id: string): Promise<RecordingSession | undefined> {
    const [session] = await db
      .select()
      .from(recordingSessions)
      .where(sql`${recordingSessions.id} = ${id} AND ${recordingSessions.isShared} = TRUE`);
    
    return session;
  }
  
  async setRecordingSessionShared(id: string, isShared: boolean): Promise<RecordingSession | undefined> {
    const [updatedSession] = await db
      .update(recordingSessions)
      .set({
        isShared,
        shareUrl: isShared ? `/recording/${id}` : null,
        updatedAt: new Date()
      })
      .where(eq(recordingSessions.id, id))
      .returning();
    
    return updatedSession;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
