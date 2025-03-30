import { RecordedAction } from '@shared/schema';
import { Separator } from '@/components/ui/separator';

interface ActionsListProps {
  actions: RecordedAction[];
}

export default function ActionsList({ actions }: ActionsListProps) {
  return (
    <aside className="w-80 border-r border-neutral-200 bg-white flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700">Recorded Actions</h2>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            <p>No actions recorded yet</p>
            <p className="mt-1">Click "Start Recording" to begin</p>
          </div>
        ) : (
          actions.map((action, index) => (
            <ActionItem key={index} action={action} />
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="text-xs text-neutral-500">
          {actions.length} actions recorded
        </div>
      </div>
    </aside>
  );
}

interface ActionItemProps {
  action: RecordedAction;
}

function ActionItem({ action }: ActionItemProps) {
  return (
    <div className="mb-2 p-2 border border-neutral-200 rounded-md bg-white shadow-sm">
      {action.type === 'click' && (
        <>
          <div className="text-xs font-medium text-neutral-500 mb-1">Click Action</div>
          <div className="font-mono text-sm">
            Click at ({action.coordinates?.x}, {action.coordinates?.y})
          </div>
          <div className="text-xs text-neutral-600 mt-1">
            Element: {action.element?.tagName} {action.element?.id ? `"${action.element.id}"` : 
              action.element?.text ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` : ''}
          </div>
        </>
      )}
      
      {action.type === 'type' && (
        <>
          <div className="text-xs font-medium text-neutral-500 mb-1">Type Action</div>
          <div className="font-mono text-sm">Type "{action.text}"</div>
        </>
      )}
      
      {action.type === 'capture' && (
        <>
          <div className="text-xs font-medium text-neutral-500 mb-1">Capture Action</div>
          <div className="font-mono text-sm">HTML Capture</div>
          <div className="text-xs text-neutral-600 mt-1">
            Size: {action.content?.length} characters
          </div>
        </>
      )}
    </div>
  );
}
