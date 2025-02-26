import React from 'react';
import { Toaster } from 'sonner';
import { FeedbackButton } from './FeedbackButton';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-0">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8 lg:px-12">
        {children}
      </div>
      <FeedbackButton />
      <Toaster position="top-right" />
    </div>
  );
};

export default Layout; 