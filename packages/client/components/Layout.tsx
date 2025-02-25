import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        {children}
      </div>
    </div>
  );
};

export default Layout; 