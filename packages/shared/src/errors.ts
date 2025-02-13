// packages/shared/src/errors.ts
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