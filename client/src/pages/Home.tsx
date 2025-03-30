import { useState } from 'react';
import ActionRecorder from '@/components/ActionRecorder';
import { RecordedAction } from '@shared/schema';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<RecordedAction[]>([]);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const addAction = (action: RecordedAction) => {
    setActions(prev => {
      // For type actions, replace the last one if it's also a type action
      if (action.type === 'type' && prev.length > 0 && prev[prev.length - 1].type === 'type') {
        return [...prev.slice(0, prev.length - 1), action];
      }
      return [...prev, action];
    });
  };

  const exportActions = () => {
    if (actions.length === 0) {
      alert('No actions to export.');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      actions: actions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `action-recording-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  return (
    <ActionRecorder 
      isRecording={isRecording}
      actions={actions}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onAddAction={addAction}
      onExportActions={exportActions}
    />
  );
}
