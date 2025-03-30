import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from 'openai';
import { RecordedAction, recordedActionSchema } from '@shared/schema';
import { z } from 'zod';

// Schema for the describe action request
const describeActionRequestSchema = z.object({
  action: recordedActionSchema
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
