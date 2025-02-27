# Railway Deployment Plan for WaveNotes API

## Deployment Strategy Overview

This document outlines our strategy for deploying the WaveNotes API service to Railway, considering our monorepo structure and the TypeScript module resolution fixes we've implemented.

## Responsibility Division

### Railway Interface Responsibilities

1. **Source Control**
   - Git repository connection
   - Branch/commit selection
   - Automatic deployment triggers

2. **Networking**
   - Domain assignment (production domains)
   - Public/private endpoints
   - SSL certificate management

3. **Build Infrastructure**
   - Compute resources allocation
   - Physical region selection
   - Build logs access and retention

4. **Deployment Management**
   - Health monitoring
   - Deployment rollbacks
   - Service status monitoring
   - Zero-downtime deployment settings

5. **Configuration Management**
   - Environment variables (API keys, database URLs, etc.)
   - Service-specific secrets
   - Production configurations

6. **Feature Controls**
   - Production feature flags
   - Service toggles

### Codebase Responsibilities

1. **Build Configuration**
   - `.railway/api.service.json` for defining build/deploy processes
   - Build command sequences that respect dependencies
   - Workspace package relationships

2. **Runtime Behavior**
   - Application error handling
   - Graceful shutdown logic
   - Health check endpoints
   - Service-to-service communication

3. **Environment Configuration**
   - Reading environment variables
   - Validation of required variables
   - Default fallbacks for development
   - Documentation of environment requirements

4. **TypeScript Configuration**
   - Module resolution strategies
   - Path mappings for monorepo packages
   - Build output configuration

## Implementation Plan

### Phase 1: Configuration Setup

1. **Create Railway Service Configuration**

   Create `.railway/api.service.json`:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "watchPatterns": [
         "packages/shared/**",
         "packages/server/api/**"
       ],
       "buildCommand": "yarn workspaces focus @wavenotes-new/shared @wavenotes-new/api && yarn workspace @wavenotes-new/shared build && yarn workspace @wavenotes-new/api build"
     },
     "deploy": {
       "numReplicas": 1,
       "startCommand": "node packages/server/api/dist/index.js",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 3
     }
   }
   ```

2. **Document Required Environment Variables**

   Create `.env.example` in the API package:
   ```
   # Database Configuration
   DATABASE_URL=postgres://user:password@host:port/database
   
   # API Configuration
   PORT=3001
   NODE_ENV=production
   
   # Service Integration
   WORKER_URL=https://worker-service-url
   
   # Authentication
   JWT_SECRET=your-jwt-secret
   
   # Add other required variables
   ```

### Phase 2: Code Preparation

1. **Health Check Endpoint**

   Ensure the API has a `/health` endpoint that checks:
   - Database connectivity
   - Worker service availability (if applicable)
   - Overall service health

2. **Environment Validation**

   Add startup validation for required environment variables:
   ```typescript
   function validateEnv() {
     const required = [
       'DATABASE_URL', 
       'PORT', 
       'JWT_SECRET'
     ];
     
     const missing = required.filter(key => !process.env[key]);
     if (missing.length > 0) {
       console.error(`Missing required environment variables: ${missing.join(', ')}`);
       process.exit(1);
     }
   }
   
   // Call at startup
   validateEnv();
   ```

3. **Graceful Shutdown**

   Implement proper shutdown handling:
   ```typescript
   function setupGracefulShutdown(server) {
     const shutdown = () => {
       console.log('Shutting down gracefully...');
       server.close(() => {
         console.log('HTTP server closed');
         // Close database connections, etc.
         process.exit(0);
       });
     };
     
     process.on('SIGTERM', shutdown);
     process.on('SIGINT', shutdown);
   }
   ```

### Phase 3: Deployment Process

1. **Initial Setup in Railway**
   - Create new service in Railway project
   - Connect GitHub repository
   - Select monorepo deployment option
   - Reference `.railway/api.service.json`

2. **Environment Configuration**
   - Add all required environment variables
   - Set appropriate values for production
   - Include database connection details

3. **Deployment Verification**
   - Monitor build logs for errors
   - Verify successful build of shared package first, then API
   - Check for successful startup
   - Test API endpoints via provided Railway URL

### Phase 4: Monitoring & Operations

1. **Health Monitoring**
   - Set up uptime monitoring for the health endpoint
   - Configure notification alerts for failures

2. **Performance Optimization**
   - Review memory/CPU utilization
   - Optimize resource allocation as needed
   - Consider scaling horizontally if required

3. **Logging Strategy**
   - Configure appropriate log levels
   - Set up log aggregation (if applicable)
   - Implement structured logging for easier querying

## Deployment Checklist

- [ ] Create `.railway` directory
- [ ] Create `api.service.json` configuration
- [ ] Document required environment variables
- [ ] Implement health check endpoint
- [ ] Add environment validation at startup
- [ ] Implement graceful shutdown handling
- [ ] Create service in Railway
- [ ] Configure environment variables
- [ ] Deploy initial version
- [ ] Verify endpoints functionality
- [ ] Set up monitoring
- [ ] Document deployment process

## Troubleshooting Guide

### Common Issues

1. **Build Failures**
   - Check dependency installation
   - Verify build order (shared package must build first)
   - Check for TypeScript errors

2. **Runtime Errors**
   - Verify all environment variables are set
   - Check database connectivity
   - Review logs for specific error messages

3. **Deployment Issues**
   - Verify service configuration is valid
   - Check resource allocation is sufficient
   - Review service logs

### Resolution Steps

For any deployment issues:
1. Check Railway logs
2. Verify configuration against this document
3. Test the equivalent build process locally
4. Make incremental changes to isolate problems

## Worker Service (Future Deployment)

Once the API service is successfully deployed, we'll follow a similar process for the worker service, with these key differences:

1. **Service Configuration**
   ```json
   {
     "build": {
       "watchPatterns": [
         "packages/shared/**",
         "packages/server/api/**",
         "packages/server/worker/**"
       ],
       "buildCommand": "yarn workspaces focus @wavenotes-new/shared @wavenotes-new/api @wavenotes-new/worker && yarn workspace @wavenotes-new/shared build && yarn workspace @wavenotes-new/api build && yarn workspace @wavenotes-new/worker build"
     },
     "deploy": {
       "startCommand": "node packages/server/worker/dist/index.js"
     }
   }
   ```

2. **Additional Environment Variables**
   - Queue configuration
   - Processing limits
   - Worker-specific API keys

3. **Coordination with API Service**
   - Ensure proper service discovery
   - Verify queue connectivity
   - Test end-to-end workflow 