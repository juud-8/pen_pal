import { useState } from 'react';
import { RecordedAction } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface InteractionAreaProps {
  isRecording: boolean;
  onAddAction: (action: RecordedAction) => void;
  onCapture: () => void;
}

export default function InteractionArea({ 
  isRecording, 
  onAddAction,
  onCapture
}: InteractionAreaProps) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;
    
    const actionData: RecordedAction = {
      type: 'type',
      timestamp: new Date().toISOString(),
      text: (e.target as HTMLInputElement).value
    };
    
    onAddAction(actionData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Interaction Area Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Interaction Area</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-neutral-600">
            Click anywhere in this area to track mouse coordinates and element information.
          </p>
          
          <div className="flex items-center space-x-4 mb-6">
            <Button id="demoButton" className="bg-primary text-white">
              Sample Button
            </Button>
            <Button id="demoButton2" variant="outline">
              Another Button
            </Button>
          </div>

          <div className="mb-6">
            <Label htmlFor="textInput" className="block text-sm font-medium text-neutral-700 mb-1">
              Text Input (type here to track keystrokes)
            </Label>
            <Input 
              type="text" 
              id="textInput" 
              className="w-full"
              placeholder="Type something..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={handleKeyUp}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-md font-medium text-neutral-700 mb-2">Interactive Elements</h3>
            <div className="grid grid-cols-2 gap-4">
              <div 
                id="box1" 
                className="h-24 bg-blue-100 rounded flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
              >
                Click Me (Box 1)
              </div>
              <div 
                id="box2" 
                className="h-24 bg-green-100 rounded flex items-center justify-center cursor-pointer hover:bg-green-200 transition-colors"
              >
                Click Me (Box 2)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Area Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Screenshot Area</CardTitle>
          <Button 
            variant="secondary"
            onClick={onCapture}
          >
            Capture HTML
          </Button>
        </CardHeader>
        <CardContent>
          <div 
            id="screenshotArea" 
            className="border border-dashed border-neutral-300 rounded-md p-4 bg-neutral-50"
          >
            <p className="text-neutral-600">This area will be captured when you click the "Capture HTML" button.</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="h-16 bg-red-100 rounded"></div>
              <div className="h-16 bg-yellow-100 rounded"></div>
              <div className="h-16 bg-purple-100 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
