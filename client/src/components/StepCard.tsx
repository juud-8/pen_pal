import { useEffect, useRef, useState } from 'react';
import { RecordedAction } from '@shared/schema';
import html2canvas from 'html2canvas';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface StepCardProps {
  action: RecordedAction;
  number: number;
  aiDescription?: string;
}

/**
 * StepCard component displays a recorded action as a step card in Scribe style
 * with step number, description, and HTML capture if available
 */
export default function StepCard({ action, number, aiDescription }: StepCardProps) {
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <Card className="mb-6 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-6 relative">
        {/* Step Number Circle */}
        <div className="absolute -left-4 top-6 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-md">
          {number}
        </div>
        
        {/* Description with padding to accommodate the step number */}
        <div className="ml-6">
          <h3 className="text-lg font-medium mb-3">{renderTextWithLinks(getDescription())}</h3>
          
          {/* Timestamp */}
          <p className="text-sm text-gray-500 mb-4">
            {new Date(action.timestamp).toLocaleTimeString()}
          </p>
          
          {/* HTML Capture Preview */}
          {captureImage && (
            <div className="mt-4 relative rounded-md overflow-hidden shadow-md" ref={containerRef}>
              <img 
                src={captureImage} 
                alt={`Capture at step ${number}`} 
                className="w-full object-contain"
              />
              
              {/* Highlight Circle (centered by default) */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-orange-500 opacity-60 animate-pulse"></div>
            </div>
          )}
          
          {/* Click indicator for click actions */}
          {action.type === 'click' && action.coordinates && (
            <div className="mt-4 bg-gray-100 p-4 rounded-md relative">
              <div className="text-sm text-gray-600">
                Click coordinates: ({action.coordinates.x}, {action.coordinates.y})
              </div>
              
              {/* Click Indicator */}
              <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full border-4 border-orange-500 opacity-60"></div>
            </div>
          )}
          
          {/* Text indicator for type actions */}
          {action.type === 'type' && action.text && (
            <div className="mt-4 bg-gray-100 p-4 rounded-md">
              <div className="text-sm font-mono bg-white p-2 rounded border border-gray-200">
                {action.text}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}