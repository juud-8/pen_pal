import { useEffect, useRef, useState } from 'react';
import { RecordedAction } from '@shared/schema';
import html2canvas from 'html2canvas';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, MousePointer, Keyboard, Camera } from 'lucide-react';

interface StepCardProps {
  action: RecordedAction;
  number: number;
  aiDescription?: string;
  previousActionTimestamp?: Date | string | null;
}

/**
 * StepCard component displays a recorded action as a step card in Scribe style
 * with step number, description, and HTML capture if available
 */
export default function StepCard({ action, number, aiDescription, previousActionTimestamp }: StepCardProps) {
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Calculate percentage for progress bar based on elapsed time
  // We'll normalize it to create a reasonable visual representation
  const getTimeElapsedPercentage = (): number => {
    if (!previousActionTimestamp) return 0;
    
    const prevTime = new Date(previousActionTimestamp).getTime();
    const currentTime = new Date(action.timestamp).getTime();
    const diffMs = currentTime - prevTime;
    
    if (diffMs <= 0) return 0;
    
    // For visual representation, we'll scale the time differences:
    // - Less than 1 second: 1-10%
    // - 1-5 seconds: 10-30%
    // - 5-15 seconds: 30-60%
    // - 15-30 seconds: 60-85%
    // - More than 30 seconds: 85-100%
    
    if (diffMs < 1000) {
      // Less than 1 second: scale to 1-10%
      return 1 + (diffMs / 1000) * 9;
    } else if (diffMs < 5000) {
      // 1-5 seconds: scale to 10-30%
      return 10 + ((diffMs - 1000) / 4000) * 20;
    } else if (diffMs < 15000) {
      // 5-15 seconds: scale to 30-60%
      return 30 + ((diffMs - 5000) / 10000) * 30;
    } else if (diffMs < 30000) {
      // 15-30 seconds: scale to 60-85%
      return 60 + ((diffMs - 15000) / 15000) * 25;
    } else {
      // More than 30 seconds: scale to 85-100%
      const maxMs = 60000; // Cap at 1 minute for 100%
      return 85 + Math.min(15, ((diffMs - 30000) / (maxMs - 30000)) * 15);
    }
  };

  // Function to check if text contains a URL
  const containsUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(text);
  };

  // Function to render text with clickable URLs
  const renderTextWithLinks = (text: string) => {
    if (!text) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (containsUrl(part)) {
        return (
          <a 
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center"
          >
            {part}
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        );
      }
      return part;
    });
  };

  // Get description text
  const getDescription = () => {
    if (aiDescription) return aiDescription;
    
    switch (action.type) {
      case 'click':
        const elementInfo = action.element?.id 
          ? `#${action.element.id}` 
          : action.element?.text 
            ? `"${action.element.text.substring(0, 20)}${action.element.text.length > 20 ? '...' : ''}"` 
            : action.element?.tagName || 'element';
        return `Click on ${elementInfo}`;
      case 'type':
        return `Type "${action.text}" in input field`;
      case 'capture':
        return `Capture page state`;
      default:
        return `${action.type} action`;
    }
  };

  // Get the icon for the action type
  const getActionIcon = () => {
    switch (action.type) {
      case 'click':
        return <MousePointer className="h-3.5 w-3.5" />;
      case 'type':
        return <Keyboard className="h-3.5 w-3.5" />;
      case 'capture':
        return <Camera className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Convert HTML content to image if the action is a capture
  useEffect(() => {
    if (action.type === 'capture' && action.content && containerRef.current) {
      // Create a temporary container for the HTML content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = action.content;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';  // Fixed width for consistency
      document.body.appendChild(tempContainer);

      // Use html2canvas to convert the HTML to an image
      html2canvas(tempContainer, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        width: 800,
        height: tempContainer.offsetHeight,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        setCaptureImage(dataUrl);
        
        // Clean up
        document.body.removeChild(tempContainer);
      }).catch(error => {
        console.error('Error generating canvas:', error);
        document.body.removeChild(tempContainer);
      });
    }
  }, [action]);

  return (
    <div className="mb-6">
      <Card className="w-full overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-0">
          {/* Step Header with Number & Description */}
          <div className="flex items-start p-6 pb-4">
            {/* Step Number Circle - Larger and more prominent */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center 
                            justify-center text-white font-bold shadow-sm mr-4">
              {number}
            </div>
            
            {/* Description */}
            <div className="flex-grow">
              {/* Action type and timing information in a more prominent way */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  {getActionIcon()}
                  <span className="ml-1 uppercase">{action.type}</span>
                </span>
                
                {getTimeElapsed() && (
                  <div className="flex items-start">
                    <div className="flex-grow">
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-amber-700">Waited {getTimeElapsed()}</span>
                      </div>
                      
                      {/* Progress bar to visualize time elapsed */}
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full"
                          style={{ 
                            width: `${Math.min(100, getTimeElapsedPercentage())}%`,
                            transition: 'width 1s ease-in-out'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className="text-base font-medium text-gray-900">
                {renderTextWithLinks(getDescription())}
              </h3>
              
              <div className="text-xs text-gray-500 mt-1">
                {new Date(action.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {/* HTML Capture Preview - With better shadow and highlighting */}
          {captureImage && (
            <div className="px-6 pb-6" ref={containerRef}>
              <div className="relative rounded-lg overflow-hidden shadow-md border border-gray-200">
                <img 
                  src={captureImage} 
                  alt={`Capture at step ${number}`} 
                  className="w-full object-contain"
                />
                
                {/* Highlight Circle - Orange with animation */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                w-16 h-16 rounded-full border-4 border-orange-500 
                                opacity-60 animate-pulse pointer-events-none"></div>
              </div>
            </div>
          )}
          
          {/* Click indicator for click actions - More Scribe-like */}
          {action.type === 'click' && action.coordinates && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                <div className="flex items-center text-sm text-gray-700">
                  <MousePointer className="h-4 w-4 mr-2 text-orange-500" />
                  Click location: ({action.coordinates.x}, {action.coordinates.y})
                </div>
                
                {/* Click Indicator */}
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full 
                                border-4 border-orange-500 opacity-70 animate-pulse"></div>
              </div>
            </div>
          )}
          
          {/* Text indicator for type actions - More polished style */}
          {action.type === 'type' && action.text && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2 text-sm text-gray-700">
                  <Keyboard className="h-4 w-4 mr-2 text-green-500" />
                  Text Input:
                </div>
                <div className="text-sm font-mono bg-white p-3 rounded border border-gray-200 text-gray-800">
                  {action.text}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}