import { Button } from '@/components/ui/button';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onExportRecording: () => void;
}

export default function RecordingControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  onExportRecording
}: RecordingControlsProps) {
  return (
    <div className="flex space-x-3">
      {isRecording ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onStopRecording}
        >
          Stop Recording
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={onStartRecording}
        >
          Start Recording
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportRecording}
      >
        Export JSON
      </Button>
    </div>
  );
}
