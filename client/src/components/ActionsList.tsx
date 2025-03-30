import { useState, useEffect } from 'react';
import { RecordedAction } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { generateActionDescription, isOpenAIInitialized, getFallbackDescription } from '@/lib/aiDescriber';
import { useToast } from '@/hooks/use-toast';

interface ActionsListProps {
  actions: RecordedAction[];
  aiEnabled: boolean;
}

export default function ActionsList({ actions, aiEnabled }: ActionsListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200 bg-neutral-50 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-neutral-700">Recorded Actions</h2>
          {actions.length > 0 && (
            <span className="text-xs bg-neutral-200 rounded-full px-2 py-0.5 text-neutral-700">
              {actions.length}
            </span>
          )}
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            <p>No actions recorded yet</p>
            <p className="mt-1">Click "Start Recording" to begin</p>
          </div>
        ) : (
          actions.map((action, index) => (
            <ActionItem 
              key={index} 
              action={action} 
              aiEnabled={aiEnabled} 
              previousActionTimestamp={index > 0 ? actions[index - 1]?.timestamp : null}
            />
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-neutral-200 bg-neutral-50 shrink-0">
        <div className="text-xs text-neutral-500">
          {actions.length} actions recorded
        </div>
      </div>
    </div>
  );
}

interface ActionItemProps {
  action: RecordedAction;
  aiEnabled: boolean;
  previousActionTimestamp?: Date | string | null;
}

function ActionItem({ action, aiEnabled, previousActionTimestamp }: ActionItemProps) {
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Calculate time elapsed between the previous action and this one
  const getTimeElapsed = (): string | null => {
    if (!previousActionTimestamp) return null;
    
    const prevTime = new Date(previousActionTimestamp).getTime();
    const currentTime = new Date(action.timestamp).getTime();
    
    // Calculate difference in milliseconds
    const diffMs = currentTime - prevTime;
    
    // Skip if the time is negative (could happen if actions are out of order)
    if (diffMs < 0) return null;
    
    // Format the time difference
    if (diffMs < 1000) {
      return `${diffMs}ms`;
    } else if (diffMs < 60000) {
      return `${(diffMs / 1000).toFixed(1)} seconds`;
    } else {
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  useEffect(() => {
    // Reset states when the action changes
    setDescription(null);
    setError(null);
    
    // Generate description using OpenAI if AI is enabled
    if (aiEnabled && isOpenAIInitialized()) {
      setIsLoading(true);
      
      generateActionDescription(action)
        .then(desc => {
          setDescription(desc);
          setError(null); // Clear any previous errors
        })
        .catch(err => {
          console.error('Error getting AI description:', err);
          setError(err instanceof Error ? err.message : 'Failed to generate description');
          
          // Show a toast notification for API errors
          toast({
            title: "Description Error",
            description: "Couldn't generate AI description. Using fallback.",
            variant: "destructive",
          });
          
          // Always set a fallback description to ensure UI continuity
          setDescription(getFallbackDescription(action));
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Use fallback description if AI is not available
      setDescription(getFallbackDescription(action));
    }
  }, [action, aiEnabled, toast]);

  return (
    <div className="mb-2 p-2 border border-neutral-200 rounded-md bg-white shadow-sm">
      {/* Action Type Header with timestamp */}
      <div className="flex justify-between items-center text-xs font-medium text-neutral-500 mb-1">
        <span>{action.type.charAt(0).toUpperCase() + action.type.slice(1)} Action</span>
        <div className="flex items-center gap-2">
          {getTimeElapsed() && (
            <div className="flex items-center text-blue-600 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {getTimeElapsed()}
            </div>
          )}
          <span className="text-neutral-400">{new Date(action.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* AI-Generated Description */}
      <div className="font-medium text-sm">
        {isLoading ? (
          <div className="flex items-center space-x-2 py-1">
            <Spinner size="sm" />
            <span className="text-neutral-500">Generating description...</span>
          </div>
        ) : (
          <div className="py-1 max-h-[80px] overflow-y-auto">{description}</div>
        )}
      </div>

      {/* Action Details (smaller, less prominent) */}
      <div className="mt-1 text-xs text-neutral-500 font-mono">
        {action.type === 'click' && (
          <div>
            Coords: ({action.coordinates?.x}, {action.coordinates?.y}) • 
            Element: {action.element?.tagName} {action.element?.id ? `#${action.element.id}` : ''}
          </div>
        )}
        
        {action.type === 'type' && (
          <div>Input: "{action.text}"</div>
        )}
        
        {action.type === 'capture' && (
          <div>Size: {action.content?.length} characters</div>
        )}
      </div>
    </div>
  );
}
