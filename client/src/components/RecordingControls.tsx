import { Button } from '@/components/ui/button';
import { Download, Circle, Square } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onExportRecording: () => void;
  actionsCount?: number;
}

export default function RecordingControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  onExportRecording,
  actionsCount = 0
}: RecordingControlsProps) {
  return (
    <div className="flex space-x-3">
      {isRecording ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onStopRecording}
          className="flex items-center gap-1.5"
        >
          <Square className="h-3.5 w-3.5" />
          Stop Recording
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 flex items-center gap-1.5"
          onClick={onStartRecording}
        >
          <Circle className="h-3.5 w-3.5" fill="currentColor" />
          Start Recording
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportRecording}
        disabled={actionsCount === 0}
        className="flex items-center gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        Export {actionsCount > 0 ? `(${actionsCount})` : ''}
      </Button>
    </div>
  );
}
