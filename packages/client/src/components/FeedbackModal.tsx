import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { FeedbackType, FeedbackRequest } from '@wavenotes-new/shared';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { showToast } from '../lib/toast';

interface FeedbackModalProps {
  onClose: () => void;
  initialType?: FeedbackType;
  summaryId?: string;
  podcastId?: string;
}

export function FeedbackModal({
  onClose,
  initialType = 'general',
  summaryId,
  podcastId
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const getPlaceholder = (type: FeedbackType) => {
    switch (type) {
      case 'bug':
        return 'Please describe what happened and what you expected...';
      case 'feature_request':
        return 'What would you like to see added to the app?';
      case 'summary_quality':
        return 'How could we improve our summaries?';
      case 'summary_retry_limit':
        return 'What would make this summary better?';
      default:
        return 'Tell us what you think...';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      showToast.error('Please enter some feedback');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const feedbackRequest: FeedbackRequest = {
        feedbackType,
        feedbackText: feedbackText.trim(),
        summaryId,
        podcastId,
        pageUrl: router.asPath,
        browserInfo: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      };
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback_type: feedbackRequest.feedbackType,
          feedback_text: feedbackRequest.feedbackText,
          summary_id: feedbackRequest.summaryId,
          podcast_id: feedbackRequest.podcastId,
          page_url: feedbackRequest.pageUrl,
          browser_info: feedbackRequest.browserInfo
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to submit feedback';
        
        // Check content type to determine how to parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            // Fall back to text response if JSON parsing fails
            errorMessage = await response.text();
          }
        } else {
          // Not a JSON response, get text directly
          errorMessage = await response.text();
        }
        
        throw new Error(errorMessage);
      }
      
      showToast.success('Thank you for your feedback!');
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Share Your Feedback</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-type">Type of Feedback</Label>
            <select
              id="feedback-type"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
              className="w-full p-2 border rounded mt-1"
              disabled={initialType === 'summary_retry_limit'}
            >
              <option value="general">General Feedback</option>
              <option value="bug">Report a Bug</option>
              <option value="feature_request">Feature Request</option>
              <option value="summary_quality">Summary Quality</option>
              {summaryId && <option value="summary_retry_limit">Re-summarize Request</option>}
            </select>
          </div>
          
          <div>
            <Label htmlFor="feedback-text">Your Feedback</Label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={getPlaceholder(feedbackType)}
              className="w-full p-2 border rounded mt-1"
              rows={5}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !feedbackText.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 