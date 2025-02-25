/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please import authMiddleware from '../middleware/auth' instead.
 * 
 * TODO: Remove this file by July 1, 2024 after ensuring no code references it.
 */

import { authMiddleware as actualAuthMiddleware } from './auth';

// Track usage of this deprecated file
const trackDeprecatedUsage = () => {
  // In a production environment, you might want to log this to your monitoring system
  const stack = new Error().stack || '';
  const caller = stack.split('\n')[2] || 'unknown';
  console.warn(
    `DEPRECATION WARNING: auth-middleware.ts was imported from ${caller}. ` +
    'This file will be removed in a future version. ' +
    'Please update your imports to use "./auth" instead.'
  );
};

// Call the tracking function
trackDeprecatedUsage();

// Re-export the actual middleware to maintain backward compatibility
export const authMiddleware = actualAuthMiddleware; 