import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { FeedbackModal } from './FeedbackModal';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 rounded-full p-3 shadow-md"
        aria-label="Give Feedback"
      >
        <MessageSquare className="h-5 w-5 mr-2" />
        <span className="text-sm">Feedback</span>
      </Button>

      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
} 