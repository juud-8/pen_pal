import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onSave: () => void;
}

export function CaptureModal({ isOpen, onClose, htmlContent, onSave }: CaptureModalProps) {
  const formattedHtml = htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl" 
        aria-labelledby="capture-modal-title"
        aria-describedby="capture-modal-description"
      >
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle id="capture-modal-title">HTML Capture</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-6 w-6 p-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <DialogDescription id="capture-modal-description" className="sr-only">
          This modal displays the HTML content that was captured from the interaction area.
        </DialogDescription>
        <div className="border border-neutral-200 rounded bg-neutral-50 p-2 max-h-[60vh] overflow-auto" aria-live="polite">
          <pre className="text-xs overflow-x-auto font-mono">
            <code dangerouslySetInnerHTML={{ __html: formattedHtml }} />
          </pre>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Save Capture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
