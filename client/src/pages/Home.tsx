import { useState, useRef, useEffect } from 'react';
import ActionRecorder from '@/components/ActionRecorder';
import RecordingList from '@/components/RecordingList';
import { RecordedAction, RecordingSession, InsertRecordingSession } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn, save } from '@/lib/utils';

// Create a Textarea component
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      props.className
    )}
    {...props}
  />
);

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<RecordedAction[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<RecordingSession | null>(null);
  const { toast } = useToast();

  // Reset form when dialog opens
  useEffect(() => {
    if (saveDialogOpen) {
      setTitle(`Recording ${new Date().toLocaleString()}`);
      setDescription('');
    }
  }, [saveDialogOpen]);

  // Load a recording's actions when selected
  useEffect(() => {
    if (selectedRecording) {
      setActions(selectedRecording.actions as RecordedAction[]);
    }
  }, [selectedRecording]);

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
      toast({
        title: 'No actions to export',
        description: 'Record some actions first',
        variant: 'destructive',
      });
      return;
    }

    setSaveDialogOpen(true);
  };

  const handleSaveRecording = async () => {
    if (actions.length === 0) return;

    try {
      setIsSaving(true);

      const exportData = {
        timestamp: new Date().toISOString(),
        actions: actions
      };

      const hasCaptures = actions.some(action => action.type === 'capture');

      const recordingData: InsertRecordingSession = {
        title: title || `Recording ${new Date().toLocaleString()}`,
        description: description || '',
        actions: actions,
        actionsCount: actions.length,
        hasCaptures,
        isShared: false,
      };

      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordingData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const savedRecording = await response.json();

      // Close dialog and show success message
      setSaveDialogOpen(false);
      toast({
        title: 'Recording Saved',
        description: 'Your recording has been saved successfully',
      });

      // Reset recording state (optional)
      // setActions([]);
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to save recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportToJson = () => {
    if (actions.length === 0) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      title: title || `Recording ${new Date().toLocaleString()}`,
      description: description || '',
      actions: actions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const fileName = `action-recording-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
    
    save(dataStr, fileName, 'application/json');
  };

  const exportToPdf = () => {
    if (actions.length === 0) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title || 'Action Recording', 14, 22);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    // Add description if it exists
    if (description) {
      doc.setFontSize(12);
      doc.text('Description:', 14, 40);
      doc.setFontSize(10);
      doc.text(description, 14, 48, { maxWidth: 180 });
    }
    
    // Add actions table
    const startY = description ? 60 : 40;
    
    // Transform actions into a format for the table
    const tableData = actions.map((action, index) => {
      let description = '';
      
      switch (action.type) {
        case 'click':
          const elementInfo = action.element?.id 
            ? `#${action.element.id}` 
            : action.element?.text 
              ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` 
              : action.element?.tagName || 'element';
          description = `Click on ${elementInfo} at (${action.coordinates?.x}, ${action.coordinates?.y})`;
          break;
        case 'type':
          description = `Type "${action.text}" in input field`;
          break;
        case 'capture':
          description = `Capture page state (${action.content?.length || 0} chars)`;
          break;
        default:
          description = `${action.type} action`;
      }
      
      return [index + 1, action.type, description, new Date(action.timestamp).toLocaleTimeString()];
    });
    
    (doc as any).autoTable({
      startY,
      head: [['#', 'Type', 'Description', 'Time']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { top: 10 },
    });
    
    const fileName = `action-recording-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.pdf`;
    doc.save(fileName);
  };

  const exportToHtml = () => {
    if (actions.length === 0) return;
    
    // Create HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Action Recording'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .meta {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-bottom: 20px;
          }
          .description {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 25px;
            border-left: 4px solid #3498db;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #3498db;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .action-type {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
            padding: 3px 8px;
            border-radius: 3px;
            background: #e74c3c;
            color: white;
          }
          .action-type.click {
            background: #3498db;
          }
          .action-type.type {
            background: #2ecc71;
          }
          .action-type.capture {
            background: #9b59b6;
          }
          .timestamp {
            color: #7f8c8d;
            font-size: 0.85em;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 0.85em;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <h1>${title || 'Action Recording'}</h1>
        <div class="meta">
          Generated: ${new Date().toLocaleString()} | Actions: ${actions.length}
        </div>
        
        ${description ? `<div class="description">${description}</div>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Description</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add each action to the HTML
    actions.forEach((action, index) => {
      let description = '';
      
      switch (action.type) {
        case 'click':
          const elementInfo = action.element?.id 
            ? `#${action.element.id}` 
            : action.element?.text 
              ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` 
              : action.element?.tagName || 'element';
          description = `Click on ${elementInfo} at (${action.coordinates?.x}, ${action.coordinates?.y})`;
          break;
        case 'type':
          description = `Type "${action.text}" in input field`;
          break;
        case 'capture':
          description = `Capture page state (${action.content?.length || 0} chars)`;
          break;
        default:
          description = `${action.type} action`;
      }
      
      htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td><span class="action-type ${action.type}">${action.type}</span></td>
          <td>${description}</td>
          <td class="timestamp">${new Date(action.timestamp).toLocaleTimeString()}</td>
        </tr>
      `;
    });
    
    // Close HTML structure
    htmlContent += `
          </tbody>
        </table>
        
        <div class="footer">
          Generated by Action Recorder &copy; ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;
    
    // Save HTML file
    const fileName = `action-recording-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.html`;
    save(htmlContent, fileName, 'text/html');
  };

  return (
    <div className="container grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
      <div className="lg:col-span-2">
        <ActionRecorder 
          isRecording={isRecording}
          actions={actions}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onAddAction={addAction}
          onExportActions={exportActions}
        />
      </div>
      
      <div className="lg:col-span-1">
        <RecordingList 
          onSelectRecording={(recording: RecordingSession) => {
            setSelectedRecording(recording);
            setActions(recording.actions as RecordedAction[]);
            toast({
              title: 'Recording Loaded',
              description: `Loaded "${recording.title}" with ${recording.actionsCount} actions`,
            });
          }}
        />
      </div>
      
      {/* Save Recording Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Recording</DialogTitle>
            <DialogDescription>
              Save your recording for future reference or export it in different formats.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recording title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this recording about?"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col space-y-2 sm:space-y-0">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={exportToJson}
                className="flex-1 sm:flex-none"
              >
                Export JSON
              </Button>
              <Button
                variant="outline"
                onClick={exportToPdf}
                className="flex-1 sm:flex-none"
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={exportToHtml}
                className="flex-1 sm:flex-none"
              >
                Export HTML
              </Button>
            </div>
            
            <div className="flex justify-between w-full">
              <Button
                variant="ghost"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRecording}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Recording'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
