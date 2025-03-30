import { useState, useEffect } from 'react';
import { RecordingSession } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Share2, Trash2, FileText, FileDown, Copy } from 'lucide-react';

export interface RecordingListProps {
  onSelectRecording?: (recording: RecordingSession) => void;
}

export default function RecordingList({ onSelectRecording }: RecordingListProps) {
  const [recordings, setRecordings] = useState<RecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch recordings on component mount
  useEffect(() => {
    fetchRecordings();
  }, []);

  // Function to fetch recordings from the API
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/recordings');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecordings(data);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
      toast({
        title: 'Error',
        description: 'Failed to load recording sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to toggle sharing for a recording
  const toggleShare = async (id: string, isCurrentlyShared: boolean) => {
    try {
      setSharingId(id);
      
      const response = await fetch(`/api/recordings/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isShared: !isCurrentlyShared }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const updatedRecording = await response.json();
      
      // Update the recordings list
      setRecordings(recordings.map(rec => 
        rec.id === id ? updatedRecording : rec
      ));
      
      // Show success toast
      toast({
        title: !isCurrentlyShared ? 'Recording Shared' : 'Recording Unshared',
        description: !isCurrentlyShared 
          ? 'You can now share this recording with others' 
          : 'This recording is no longer publicly accessible',
      });
      
      // If newly shared, copy the share link to clipboard
      if (!isCurrentlyShared && updatedRecording.shareUrl) {
        const shareUrl = `${window.location.origin}${updatedRecording.shareUrl}`;
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Share Link Copied',
          description: 'The share link has been copied to your clipboard',
        });
      }
    } catch (err) {
      console.error('Failed to toggle sharing:', err);
      toast({
        title: 'Error',
        description: 'Failed to update sharing settings',
        variant: 'destructive',
      });
    } finally {
      setSharingId(null);
    }
  };

  // Function to delete a recording
  const deleteRecording = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Remove the deleted recording from state
      setRecordings(recordings.filter(rec => rec.id !== id));
      
      toast({
        title: 'Recording Deleted',
        description: 'The recording has been permanently deleted',
      });
    } catch (err) {
      console.error('Failed to delete recording:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete recording',
        variant: 'destructive',
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // If loading, show a loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
        <span className="ml-2 text-sm text-gray-500">Loading recordings...</span>
      </div>
    );
  }

  // If error, show an error message
  if (error) {
    return (
      <div className="text-center p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-600 font-medium mb-2">Error loading recordings</p>
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" className="mt-3" onClick={fetchRecordings}>
          Retry
        </Button>
      </div>
    );
  }

  // If no recordings, show a message
  if (recordings.length === 0) {
    return (
      <div className="text-center p-6 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-500 mb-2">No recordings saved yet</p>
        <p className="text-sm text-gray-400">Record some actions and save them to see them here</p>
      </div>
    );
  }

  // Render the list of recordings
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Recent Recordings</h2>
      
      {recordings.map((recording) => (
        <Card key={recording.id} className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{recording.title}</CardTitle>
                <CardDescription className="text-sm">
                  {formatDate(recording.createdAt)}
                </CardDescription>
              </div>
              <div className="flex space-x-1">
                {recording.hasCaptures && (
                  <Badge variant="outline" className="bg-blue-50">Captures</Badge>
                )}
                <Badge>
                  {recording.actionsCount} {recording.actionsCount === 1 ? 'action' : 'actions'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pb-2">
            {recording.description && (
              <p className="text-sm text-gray-600">{recording.description}</p>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between pt-1">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectRecording?.(recording)}
              >
                <FileText className="h-4 w-4 mr-1" />
                View
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleShare(recording.id, !!recording.isShared)}
                disabled={sharingId === recording.id}
              >
                {sharingId === recording.id ? (
                  <Spinner size="sm" className="mr-1" />
                ) : (
                  <Share2 className="h-4 w-4 mr-1" />
                )}
                {recording.isShared ? 'Unshare' : 'Share'}
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => deleteRecording(recording.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}