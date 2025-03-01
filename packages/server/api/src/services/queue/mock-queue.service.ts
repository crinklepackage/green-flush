import { QueueServiceInterface, JobOptions, Job } from './queue-service.interface';

/**
 * In-memory mock implementation of the QueueServiceInterface
 * 
 * This implementation is used for development and testing environments
 * where a real Redis connection is not available or needed.
 */
export class MockQueueService implements QueueServiceInterface {
  private jobs: Map<string, Job> = new Map();
  private nextId = 1;
  private connected = true;
  
  constructor(private readonly queueName: string) {
    console.log(`Initializing MOCK queue "${queueName}" (in-memory only)`);
  }
  
  async addJob<T>(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    const id = `${this.nextId++}`;
    const job: Job = {
      id,
      data,
      status: 'added'
    };
    
    this.jobs.set(id, job);
    
    console.log(`[MOCK] Added job ${id} to queue "${this.queueName}"`, { name, data, options });
    
    // Simulate job processing after a delay
    if (options.delay) {
      setTimeout(() => this.processJob(id), options.delay);
    } else {
      // Process immediately but asynchronously
      setTimeout(() => this.processJob(id), 10);
    }
    
    return job;
  }
  
  async getJob(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    
    // Return a copy to prevent external modification
    return { ...job };
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async healthCheck(): Promise<{ status: string; details?: any }> {
    return {
      status: 'healthy',
      details: {
        isMock: true,
        jobCount: this.jobs.size,
        queueName: this.queueName
      }
    };
  }
  
  async close(): Promise<void> {
    this.connected = false;
    console.log(`[MOCK] Closed queue "${this.queueName}"`);
  }
  
  // Helper method to simulate job processing
  private processJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    
    // Update job status to simulate processing
    job.status = 'active';
    console.log(`[MOCK] Processing job ${id} in queue "${this.queueName}"`);
    
    // Simulate successful completion after a short delay
    setTimeout(() => {
      if (job) {
        job.status = 'completed';
        console.log(`[MOCK] Completed job ${id} in queue "${this.queueName}"`);
      }
    }, 100);
  }
} 