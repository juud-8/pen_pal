import { useState, useEffect } from 'react';
import { RecordedAction } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui';
import { generateActionDescription, isOpenAIInitialized, getFallbackDescription } from '@/lib/aiDescriber';

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
            <ActionItem key={index} action={action} aiEnabled={aiEnabled} />
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
}

function ActionItem({ action, aiEnabled }: ActionItemProps) {
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Generate description using OpenAI if AI is enabled
    if (aiEnabled && isOpenAIInitialized()) {
      setIsLoading(true);
      
      generateActionDescription(action)
        .then(desc => {
          setDescription(desc);
        })
        .catch(err => {
          console.error('Error getting AI description:', err);
          setDescription(getFallbackDescription(action));
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Use fallback description if AI is not available
      setDescription(getFallbackDescription(action));
    }
  }, [action, aiEnabled]);

  return (
    <div className="mb-2 p-2 border border-neutral-200 rounded-md bg-white shadow-sm">
      {/* Action Type Header */}
      <div className="text-xs font-medium text-neutral-500 mb-1">
        {action.type.charAt(0).toUpperCase() + action.type.slice(1)} Action
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
