import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure that the authenticated user has admin privileges
 * This middleware should be used after the authMiddleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if user exists (should be added by authMiddleware)
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // List of admin users by ID and email
  const ADMIN_USER_IDS = [
    // Add your admin user IDs here
    '7d7a70c3-3cf5-4b32-a663-c60c7438dd20' // Replace with your actual admin ID
  ];

  const ADMIN_EMAILS = [
    'robert@wavenotes.fm'
    // Add other admin emails as needed
  ];

  // Check if user is admin by ID or email
  const isAdminById = ADMIN_USER_IDS.includes(req.user.id);
  const isAdminByEmail = req.user.email && ADMIN_EMAILS.includes(req.user.email);

  if (!isAdminById && !isAdminByEmail) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  // User is an admin, proceed
  next();
} 