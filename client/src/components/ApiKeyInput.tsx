import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { initializeOpenAI, isOpenAIInitialized } from '@/lib/aiDescriber';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyInputProps {
  onApiKeySet: (isSet: boolean) => void;
}

export default function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showInput, setShowInput] = useState(!isOpenAIInitialized());
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSetApiKey = () => {
    // Reset validation state
    setIsValidating(true);
    
    // Validate API key format
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      setIsValidating(false);
      return;
    }
    
    // Basic format check for OpenAI API keys (they start with "sk-")
    if (!apiKey.trim().startsWith('sk-')) {
      toast({
        title: "Invalid API Key Format",
        description: "OpenAI API keys should start with 'sk-'",
        variant: "destructive",
      });
      setIsValidating(false);
      return;
    }

    try {
      // Initialize the OpenAI client with the API key
      const success = initializeOpenAI(apiKey);
      
      if (success) {
        setShowInput(false);
        onApiKeySet(true);
        toast({
          title: "API Key Set",
          description: "OpenAI API is now ready to use",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to initialize OpenAI client. Check your API key format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="mb-4">
      {showInput ? (
        <div className="space-y-3 p-3 border border-neutral-200 rounded-md bg-neutral-50">
          <Alert>
            <AlertDescription>
              Enter your OpenAI API key to enable AI-generated descriptions for recorded actions.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <div className="flex space-x-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSetApiKey} 
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Validating...
                  </>
                ) : (
                  "Set API Key"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 mb-3">
          <span>OpenAI API key is set</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowInput(true)}
            className="h-7 text-xs"
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}