import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { RecordingSession, RecordedAction } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import ActionsList from '@/components/ActionsList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { save } from '@/lib/utils';

export default function SharedRecording() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [recording, setRecording] = useState<RecordingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch the recording on component mount
  useEffect(() => {
    fetchRecording();
  }, [id]);

  // Function to fetch the shared recording from the API
  const fetchRecording = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/shared-recordings/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This recording is not available or has been deleted');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecording(data);
    } catch (err) {
      console.error('Failed to fetch recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recording');
      toast({
        title: 'Error',
        description: 'Could not load the shared recording',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Export to JSON
  const exportToJson = () => {
    if (!recording) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      title: recording.title,
      description: recording.description,
      actions: recording.actions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const fileName = `action-recording-${id}.json`;
    
    save(dataStr, fileName, 'application/json');
  };

  // Export to PDF
  const exportToPdf = () => {
    if (!recording) return;

    // Import autoTable type
    // @ts-ignore this is a dynamic import for the jspdf-autotable plugin
    import('jspdf-autotable').then(() => {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(recording.title, 14, 22);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add description if it exists
      if (recording.description) {
        doc.setFontSize(12);
        doc.text('Description:', 14, 40);
        doc.setFontSize(10);
        doc.text(recording.description, 14, 48, { maxWidth: 180 });
      }
      
      // Add actions table
      const startY = recording.description ? 60 : 40;
      
      // Transform actions into a format for the table
      const tableData = (recording.actions as RecordedAction[]).map((action, index) => {
        let actionDesc = '';
        
        switch (action.type) {
          case 'click':
            const elementInfo = action.element?.id 
              ? `#${action.element.id}` 
              : action.element?.text 
                ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` 
                : action.element?.tagName || 'element';
            actionDesc = `Click on ${elementInfo} at (${action.coordinates?.x}, ${action.coordinates?.y})`;
            break;
          case 'type':
            actionDesc = `Type "${action.text}" in input field`;
            break;
          case 'capture':
            actionDesc = `Capture page state (${action.content?.length || 0} chars)`;
            break;
          default:
            actionDesc = `${action.type} action`;
        }
        
        return [index + 1, action.type, actionDesc, new Date(action.timestamp).toLocaleTimeString()];
      });
      
      // Use the jspdf-autotable plugin
      // @ts-ignore
      doc.autoTable({
        startY,
        head: [['#', 'Type', 'Description', 'Time']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 10 },
      });
      
      const fileName = `action-recording-${id}.pdf`;
      doc.save(fileName);
    });
  };

  // Export to HTML
  const exportToHtml = () => {
    if (!recording) return;
    
    // Create HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${recording.title}</title>
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
        <h1>${recording.title}</h1>
        <div class="meta">
          Created: ${formatDate(recording.createdAt)} | Actions: ${recording.actionsCount}
        </div>
        
        ${recording.description ? `<div class="description">${recording.description}</div>` : ''}
        
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
    (recording.actions as RecordedAction[]).forEach((action, index) => {
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
    const fileName = `action-recording-${id}.html`;
    save(htmlContent, fileName, 'text/html');
  };

  // Display a loading state
  if (loading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading shared recording...</p>
      </div>
    );
  }

  // Display an error message
  if (error || !recording) {
    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-red-500">Recording Not Found</CardTitle>
            <CardDescription>
              {error || 'This recording may have been deleted or is not currently shared.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Display the recording
  return (
    <div className="container py-6">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => setLocation('/')}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{recording.title}</CardTitle>
              <CardDescription>
                Shared on {formatDate(recording.createdAt)}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToJson}
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToPdf}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToHtml}
              >
                <FileText className="h-4 w-4 mr-1" />
                HTML
              </Button>
            </div>
          </div>
          {recording.description && (
            <p className="mt-2 text-sm text-muted-foreground">{recording.description}</p>
          )}
        </CardHeader>
        
        <CardContent>
          <h3 className="text-lg font-medium mb-4">Actions ({recording.actionsCount})</h3>
          <ActionsList 
            actions={recording.actions as RecordedAction[]} 
            aiEnabled={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}