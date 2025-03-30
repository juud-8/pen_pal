import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // This application doesn't require any backend API routes
  // as it's a client-side only application
  
  const httpServer = createServer(app);

  return httpServer;
}
