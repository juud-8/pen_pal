import { useEffect, useRef, useState } from 'react';
import { RecordedAction } from '@shared/schema';
import RecordingControls from './RecordingControls';
import ActionsList from './ActionsList';
import InteractionArea from './InteractionArea';
import ApiKeyInput from './ApiKeyInput';
import { CaptureModal } from './ui/capture-modal';

interface ActionRecorderProps {
  isRecording: boolean;
  actions: RecordedAction[];
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAddAction: (action: RecordedAction) => void;
  onExportActions: () => void;
}

export default function ActionRecorder({
  isRecording,
  actions,
  onStartRecording,
  onStopRecording,
  onAddAction,
  onExportActions
}: ActionRecorderProps) {
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [capturedHtml, setCapturedHtml] = useState('');
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Handle mouse click tracking
  useEffect(() => {
    if (!isRecording) return;

    const trackMouseClicks = (event: MouseEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      const target = event.target as HTMLElement;
      const elementText = target.innerText?.trim() || '';
      const elementId = target.id || '';
      
      const actionData: RecordedAction = {
        type: 'click',
        timestamp: new Date().toISOString(),
        coordinates: { x, y },
        element: {
          id: elementId,
          text: elementText,
          tagName: target.tagName
        }
      };
      
      onAddAction(actionData);
    };

    document.addEventListener('click', trackMouseClicks);
    
    return () => {
      document.removeEventListener('click', trackMouseClicks);
    };
  }, [isRecording, onAddAction]);

  const handleCapture = () => {
    const screenshotArea = document.getElementById('screenshotArea');
    if (screenshotArea) {
      const htmlContent = screenshotArea.outerHTML;
      setCapturedHtml(htmlContent);
      setShowCaptureModal(true);
    }
  };

  const handleSaveCapture = () => {
    if (!isRecording) {
      alert('Recording is not active. Start recording to capture actions.');
      setShowCaptureModal(false);
      return;
    }
    
    const actionData: RecordedAction = {
      type: 'capture',
      timestamp: new Date().toISOString(),
      content: capturedHtml
    };
    
    onAddAction(actionData);
    setShowCaptureModal(false);
  };

  return (
    <div className="bg-neutral-50 text-neutral-800 h-screen flex flex-col">
      {/* Header with controls */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-neutral-800">Action Recorder</h1>
          {isRecording && (
            <div className="ml-3">
              <span className="inline-block w-3 h-3 bg-accent animate-pulse rounded-full mr-1"></span>
              <span className="text-sm font-medium text-accent">Recording</span>
            </div>
          )}
        </div>
        <RecordingControls 
          isRecording={isRecording}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onExportRecording={onExportActions}
        />
      </header>

      {/* Main content area with sidebar layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with recorded actions */}
        <div className="w-80 border-r border-neutral-200 bg-white flex flex-col h-full">
          <div className="p-3 border-b border-neutral-200">
            <ApiKeyInput onApiKeySet={setIsAiEnabled} />
          </div>
          <div className="flex-1 flex flex-col">
            <ActionsList actions={actions} aiEnabled={isAiEnabled} />
          </div>
        </div>

        {/* Main content area for interaction */}
        <main className="flex-1 overflow-auto p-6 bg-neutral-50" ref={mainRef}>
          <InteractionArea 
            isRecording={isRecording} 
            onAddAction={onAddAction}
            onCapture={handleCapture}
          />
        </main>
      </div>

      {/* Capture Modal */}
      <CaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        htmlContent={capturedHtml}
        onSave={handleSaveCapture}
      />
    </div>
  );
}
