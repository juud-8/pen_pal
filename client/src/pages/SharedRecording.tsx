import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { RecordingSession, RecordedAction } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, Download, FileText, Clock, User, Calendar, CheckCircle2, Share2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
// Import jspdf-autotable for PDF exports
import 'jspdf-autotable';
import { save } from '@/lib/utils';
import StepCard from '@/components/StepCard';
import { Tag, TagGroup } from '@/components/ui/tag';

/**
 * SharedRecording component displays a recording in Scribe-style format
 * with step cards, metadata, and export options
 */
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

  // Calculate total time between first and last action
  const totalDurationSeconds = useMemo(() => {
    if (!recording || !recording.actions || !Array.isArray(recording.actions) || recording.actions.length < 2) {
      return 30; // Default duration if not enough actions
    }
    
    const actions = recording.actions as RecordedAction[];
    const firstTimestamp = new Date(actions[0].timestamp).getTime();
    const lastTimestamp = new Date(actions[actions.length - 1].timestamp).getTime();
    
    return Math.round((lastTimestamp - firstTimestamp) / 1000);
  }, [recording]);
  
  // Calculate time distribution between actions for the timeline
  const actionTimings = useMemo(() => {
    if (!recording || !recording.actions || !Array.isArray(recording.actions) || recording.actions.length < 2) {
      return [];
    }
    
    const actions = recording.actions as RecordedAction[];
    const result = [];
    
    // Start with the first action
    let previousTimestamp = new Date(actions[0].timestamp).getTime();
    
    // Calculate durations between consecutive actions
    for (let i = 1; i < actions.length; i++) {
      const currentTimestamp = new Date(actions[i].timestamp).getTime();
      const duration = currentTimestamp - previousTimestamp;
      
      result.push({
        index: i,
        duration,
        durationFormatted: formatDuration(duration),
        percentage: 0 // Will calculate after we have all durations
      });
      
      previousTimestamp = currentTimestamp;
    }
    
    // Calculate percentages based on total duration
    const totalDuration = result.reduce((sum, item) => sum + item.duration, 0);
    
    if (totalDuration > 0) {
      result.forEach(item => {
        item.percentage = (item.duration / totalDuration) * 100;
      });
    }
    
    return result;
  }, [recording]);
  
  // Format duration in milliseconds to a human-readable string
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

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
      actions: Array.isArray(recording.actions) ? recording.actions : []
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const fileName = `action-recording-${id}.json`;
    
    save(dataStr, fileName, 'application/json');
  };

  /**
   * Export actions to PDF format with proper table formatting
   * Uses jspdf and jspdf-autotable to create a structured document
   * And html2canvas for HTML captures if present
   */
  const exportToPdf = async () => {
    if (!recording) return;

    try {
      // First, import the required jspdf-autotable library
      await import('jspdf-autotable');
      
      // For html captures, if present
      const html2canvas = (await import('html2canvas')).default;
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add document title
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
      const actionList = Array.isArray(recording.actions) ? recording.actions as RecordedAction[] : [];
      const tableData = actionList.map((action, index) => {
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
      
      // Create table with all actions
      // Now using the properly typed autoTable function
      doc.autoTable({
        startY,
        head: [['#', 'Type', 'Description', 'Time']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 10 },
        didDrawPage: (data) => {
          // Add page numbers if multiple pages
          if (doc.getNumberOfPages() > 1) {
            doc.setFontSize(8);
            doc.text(
              `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10
            );
          }
        }
      });
      
      // Process HTML captures separately, if any exist
      const captureActions = actionList.filter(action => action.type === 'capture' && action.content);
      
      if (captureActions.length > 0) {
        // Add a section header for captures
        const lastPosition = (doc as any).lastAutoTable.finalY || startY;
        doc.setFontSize(14);
        doc.text('HTML Captures', 14, lastPosition + 15);
        
        // For each capture, create a visual representation
        for (let i = 0; i < captureActions.length; i++) {
          const capture = captureActions[i];
          
          try {
            // Create a temporary container for the HTML content
            const container = document.createElement('div');
            container.innerHTML = capture.content || '';
            container.style.width = '500px';
            container.style.padding = '10px';
            container.style.border = '1px solid #ccc';
            container.style.backgroundColor = '#fff';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            
            document.body.appendChild(container);
            
            // Convert HTML to canvas
            const canvas = await html2canvas(container, {
              scale: 0.7, // Scale down to fit in PDF
              logging: false,
              backgroundColor: '#ffffff'
            });
            
            // Remove the temporary container
            document.body.removeChild(container);
            
            // Add a new page for each capture
            if (i > 0) {
              doc.addPage();
            } else {
              // For the first capture, check if we need a new page
              if (lastPosition > doc.internal.pageSize.height - 100) {
                doc.addPage();
              }
            }
            
            // Add caption for the capture
            const captureIndex = actionList.findIndex(a => a === capture) + 1;
            doc.setFontSize(12);
            doc.text(`Capture #${captureIndex} - Step ${captureIndex}`, 14, 20);
            doc.setFontSize(10);
            doc.text(new Date(capture.timestamp).toLocaleString(), 14, 30);
            
            // Add the canvas as an image to the PDF
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = doc.internal.pageSize.getWidth() - 28;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 14, 40, imgWidth, imgHeight);
            
          } catch (err) {
            console.error('Error adding HTML capture to PDF:', err);
            // Continue with next capture if one fails
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            doc.text(`Error rendering capture: ${errorMessage}`, 14, 40);
            doc.setTextColor(0, 0, 0);
          }
        }
      }
      
      // Save the PDF file
      const fileName = `action-recording-${id}.pdf`;
      doc.save(fileName);
      
      toast({
        title: 'PDF Generated',
        description: 'Your recording has been exported to PDF format',
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Export Failed',
        description: 'Could not generate PDF. Try again or use another export format.',
        variant: 'destructive',
      });
    }
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
    const htmlActionList = Array.isArray(recording.actions) ? recording.actions : [];
    htmlActionList.forEach((action, index) => {
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
      <div className="bg-gray-50 min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto pt-8 pb-12 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading recording...</p>
        </div>
      </div>
    );
  }

  // Display an error message
  if (error || !recording) {
    return (
      <div className="bg-gray-50 min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setLocation('/')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <Card className="mx-auto">
            <CardHeader>
              <CardTitle className="text-red-500 text-xl">Recording Not Found</CardTitle>
              <CardDescription>
                {error || 'This recording may have been deleted or is not currently shared.'}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setLocation('/')}>
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Display the recording in Scribe-style format
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Fixed navigation with export buttons */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm py-4 px-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToJson}
              className="bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToPdf}
              className="bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToHtml}
              className="bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              HTML
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto py-12 px-6">
        {/* Recording Header Section - Scribe Style */}
        <div className="mb-12">
          {/* Title with larger, bolder font */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
            Recording {id.substring(0, 6)} - {new Date(recording.createdAt).toLocaleDateString()}
          </h1>
          
          {/* Metadata Row - Better layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-full">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Created by</div>
                <div className="font-medium">Anonymous User</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-green-50 p-2 rounded-full">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium">
                  {recording.actionsCount} steps • {totalDurationSeconds} seconds
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-purple-50 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Created on</div>
                <div className="font-medium">{formatDate(recording.createdAt)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-orange-50 p-2 rounded-full">
                <Share2 className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Shareable Link</div>
                <div className="font-medium text-blue-600 cursor-pointer hover:underline" 
                     onClick={() => {
                       navigator.clipboard.writeText(window.location.href);
                       toast({
                         title: "Link Copied",
                         description: "Shareable link copied to clipboard"
                       });
                     }}>
                  Copy Link
                </div>
              </div>
            </div>
          </div>
          
          {/* Tags - Clickable pills */}
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">Tags</div>
            <TagGroup>
              <Tag text="Tutorial" color="blue" onClick={() => {}} />
              <Tag text="Web" color="green" onClick={() => {}} />
              <Tag text="Guide" color="purple" onClick={() => {}} />
            </TagGroup>
          </div>
          
          {/* Steps Summary Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">Steps Summary</h2>
            </div>
            
            {recording.description && (
              <p className="text-gray-700 mb-4">{recording.description}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{recording.actionsCount}</div>
                <div className="text-xs text-gray-500">Total Steps</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {Array.isArray(recording.actions) ? 
                    recording.actions.filter(a => a.type === 'click').length : 0}
                </div>
                <div className="text-xs text-gray-500">Clicks</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {Array.isArray(recording.actions) ? 
                    recording.actions.filter(a => a.type === 'type').length : 0}
                </div>
                <div className="text-xs text-gray-500">Text Inputs</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">{totalDurationSeconds}s</div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
            </div>
            
            {/* Timeline visualization showing the timing between steps */}
            {actionTimings.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-700 mb-2">Steps Timeline</div>
                <div className="flex items-center mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    1
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {new Date(Array.isArray(recording.actions) ? recording.actions[0].timestamp : '').toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Timeline visualization */}
                <div className="w-full mt-2">
                  {actionTimings.map((timing, index) => (
                    <div key={index} className="mb-3">
                      {/* Time duration bar */}
                      <div className="flex items-center">
                        <div className="w-full bg-gray-100 h-6 rounded-md flex items-center relative overflow-hidden">
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-amber-100 opacity-60"
                            style={{ width: `${Math.max(2, timing.percentage)}%` }}
                          ></div>
                          <div className="ml-2 text-xs font-medium text-amber-800 z-10 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {timing.durationFormatted}
                          </div>
                        </div>
                      </div>
                      
                      {/* Next step indicator */}
                      <div className="flex items-center mt-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {timing.index + 1}
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {Array.isArray(recording.actions) ? new Date(recording.actions[timing.index].timestamp).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Step List - Cleaner and more Scribe-like */}
        <div>
          <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md mr-2 text-sm">
              {recording.actionsCount}
            </span>
            Steps Recorded
          </h2>
          
          {/* Render the steps */}
          {(() => {
            // Create a typesafe version of the actions array
            const typesafeActions: RecordedAction[] = Array.isArray(recording.actions) ? 
              recording.actions.map(a => a as RecordedAction) : [];
              
            return typesafeActions.map((action, index) => (
              <StepCard 
                key={index}
                action={action}
                number={index + 1}
                previousActionTimestamp={index > 0 ? typesafeActions[index - 1]?.timestamp : null}
              />
            ));
          })()}
        </div>
        
        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="text-gray-500 text-sm">
            Recorded with Action Recorder
          </div>
          <div className="text-gray-400 text-xs mt-1">
            Shared on {formatDate(recording.createdAt)}
          </div>
        </div>
      </main>
    </div>
  );
}