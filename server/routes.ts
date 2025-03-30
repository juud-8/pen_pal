import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from 'openai';
import { RecordedAction, recordedActionSchema, insertRecordingSessionSchema, updateRecordingSessionSchema } from '@shared/schema';
import { z } from 'zod';

// Schema for the describe action request
const describeActionRequestSchema = z.object({
  action: recordedActionSchema
});

// Schema for the share recording request
const shareRecordingRequestSchema = z.object({
  id: z.string(),
  isShared: z.boolean()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint for describing actions using OpenAI
  app.post('/api/describe-action', async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validatedData = describeActionRequestSchema.parse(req.body);
      const action = validatedData.action;
      
      // Check if we have an OpenAI API key in environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: 'OpenAI API key not configured' 
        });
      }
      
      // Create OpenAI client
      const openai = new OpenAI({ apiKey });
      
      // Generate the prompt based on the action
      const prompt = createPromptFromAction(action);
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });
      
      // Extract and return the description
      const description = response.choices[0].message.content?.trim() || 
        getFallbackDescription(action);
      
      return res.json({ description });
      
    } catch (error) {
      console.error('Error describing action:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request format', details: error.errors });
      }
      
      return res.status(500).json({ 
        error: 'Failed to generate description',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // =================== Recording Session Endpoints ===================
  
  // Get all recording sessions
  app.get('/api/recordings', async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getAllRecordingSessions();
      return res.json(sessions);
    } catch (error) {
      console.error('Error fetching recording sessions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch recording sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get a specific recording session by ID
  app.get('/api/recordings/:id', async (req: Request, res: Response) => {
    try {
      const session = await storage.getRecordingSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Recording session not found' });
      }
      return res.json(session);
    } catch (error) {
      console.error(`Error fetching recording session with ID ${req.params.id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to fetch recording session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Create a new recording session
  app.post('/api/recordings', async (req: Request, res: Response) => {
    try {
      const validatedData = insertRecordingSessionSchema.parse(req.body);
      const session = await storage.createRecordingSession(validatedData);
      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating recording session:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request format', details: error.errors });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create recording session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Update an existing recording session
  app.put('/api/recordings/:id', async (req: Request, res: Response) => {
    try {
      const validatedData = updateRecordingSessionSchema.parse(req.body);
      const session = await storage.updateRecordingSession(req.params.id, validatedData);
      
      if (!session) {
        return res.status(404).json({ error: 'Recording session not found' });
      }
      
      return res.json(session);
    } catch (error) {
      console.error(`Error updating recording session with ID ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request format', details: error.errors });
      }
      
      return res.status(500).json({ 
        error: 'Failed to update recording session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Delete a recording session
  app.delete('/api/recordings/:id', async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteRecordingSession(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: 'Recording session not found' });
      }
      
      return res.status(204).end();
    } catch (error) {
      console.error(`Error deleting recording session with ID ${req.params.id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to delete recording session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Share/unshare a recording session
  app.post('/api/recordings/:id/share', async (req: Request, res: Response) => {
    try {
      const validatedData = shareRecordingRequestSchema.parse(req.body);
      const session = await storage.setRecordingSessionShared(req.params.id, validatedData.isShared);
      
      if (!session) {
        return res.status(404).json({ error: 'Recording session not found' });
      }
      
      return res.json(session);
    } catch (error) {
      console.error(`Error sharing recording session with ID ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request format', details: error.errors });
      }
      
      return res.status(500).json({ 
        error: 'Failed to share recording session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get a shared recording (public endpoint)
  app.get('/api/shared-recordings/:id', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSharedRecordingSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: 'Shared recording not found or not public' });
      }
      
      return res.json(session);
    } catch (error) {
      console.error(`Error fetching shared recording with ID ${req.params.id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to fetch shared recording',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Convert action data to a prompt for OpenAI
 */
function createPromptFromAction(action: RecordedAction): string {
  let prompt = `Describe the following user action in natural language as a step in a tutorial. Be concise but descriptive:\n\n`;
  
  switch (action.type) {
    case 'click':
      prompt += `Action Type: Mouse Click\n`;
      prompt += `Coordinates: (${action.coordinates?.x}, ${action.coordinates?.y})\n`;
      prompt += `Element: ${action.element?.tagName || 'Unknown'}\n`;
      
      if (action.element?.id) {
        prompt += `Element ID: ${action.element.id}\n`;
      }
      
      if (action.element?.text) {
        prompt += `Element Text: "${action.element.text}"\n`;
      }
      break;
      
    case 'type':
      prompt += `Action Type: Text Input\n`;
      prompt += `Text Entered: "${action.text}"\n`;
      break;
      
    case 'capture':
      prompt += `Action Type: HTML Capture\n`;
      prompt += `Content Size: ${action.content?.length || 0} characters\n`;
      break;
  }
  
  prompt += `\nGenerate a short, clear instruction describing this action as if you were writing a step in a how-to guide.`;
  return prompt;
}

/**
 * Get a fallback description for when the API call fails
 */
function getFallbackDescription(action: RecordedAction): string {
  switch (action.type) {
    case 'click':
      const elementInfo = action.element?.id 
        ? `#${action.element.id}` 
        : action.element?.text 
          ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` 
          : action.element?.tagName || 'element';
      
      return `Click on the ${elementInfo} at position (${action.coordinates?.x}, ${action.coordinates?.y})`;
      
    case 'type':
      return `Type "${action.text}" in the input field`;
      
    case 'capture':
      return `Capture the current state of the page (${action.content?.length || 0} characters)`;
      
    default:
      return `Perform action: ${action.type}`;
  }
}
