export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public context: Record<string, any>
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class PlatformError extends Error {
  constructor(public details: {
    platform: 'youtube' | 'spotify'
    code: string
    message: string
    context: Record<string, any>
  }) {
    super(details.message)
    this.name = 'PlatformError'
  }
} 


export class TranscriptError extends Error {
  constructor(
    message: string,
    public source: string,
    public url: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'TranscriptError'
  }
}