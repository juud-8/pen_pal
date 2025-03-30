import { RecordedAction } from '@shared/schema';
import { apiRequest } from './queryClient';

// Flag to track whether API key is set
let apiKeySet = false;

/**
 * Set up the OpenAI API key
 * @param apiKey OpenAI API key
 */
export const initializeOpenAI = (apiKey: string): boolean => {
  // We don't actually use the API key in the frontend anymore,
  // we just track whether it's been set, as it's stored in
  // server-side environment variables
  try {
    if (apiKey && apiKey.trim().startsWith('sk-')) {
      apiKeySet = true;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
    return false;
  }
};

/**
 * Check if the OpenAI API key is initialized
 */
export const isOpenAIInitialized = (): boolean => {
  return apiKeySet;
};

/**
 * Generate a human-readable description for a recorded action using OpenAI API
 * @param action The recorded action to describe
 * @returns Promise with the AI-generated description
 */
export const generateActionDescription = async (action: RecordedAction): Promise<string> => {
  if (!apiKeySet) {
    return getFallbackDescription(action);
  }
  
  try {
    // Call our server-side API endpoint that handles OpenAI interactions
    const response = await apiRequest(
      'POST', 
      '/api/describe-action', 
      { action }
    );
    
    const data = await response.json();
    return data.description || getFallbackDescription(action);
  } catch (error) {
    console.error('Error generating description:', error);
    return getFallbackDescription(action);
  }
};

/**
 * Get a fallback description for when the API call fails
 */
export const getFallbackDescription = (action: RecordedAction): string => {
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
};