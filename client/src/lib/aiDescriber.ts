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
      // Store the API key temporarily for the session
      // The actual API key is used in the server
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
    console.warn('OpenAI API key not set, using fallback description');
    return getFallbackDescription(action);
  }
  
  try {
    // Call our server-side API endpoint that handles OpenAI interactions
    const response = await apiRequest(
      'POST', 
      '/api/describe-action', 
      { action }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('API request failed:', errorData);
      throw new Error(errorData.error || 'Failed to get description from API');
    }
    
    const data = await response.json();
    
    if (!data || !data.description) {
      console.warn('API returned empty description');
      return getFallbackDescription(action);
    }
    
    return data.description;
  } catch (error) {
    // Detailed error logging for diagnostics
    console.error('Error generating action description:', error);
    
    // Always return a fallback to ensure the UI doesn't break
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
      
      return `Click on the ${elementInfo} at position (${action.coordinates?.x || 0}, ${action.coordinates?.y || 0})`;
      
    case 'type':
      return `Type "${action.text || ''}" in the input field`;
      
    case 'capture':
      return `Capture the current state of the page (${action.content?.length || 0} characters)`;
      
    default:
      return `Perform action: ${action.type || 'unknown'}`;
  }
};