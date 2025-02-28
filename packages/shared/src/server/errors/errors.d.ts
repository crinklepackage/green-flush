export declare class ValidationError extends Error {
    errors: string[];
    constructor(message: string, errors: string[]);
}
export declare class DatabaseError extends Error {
    code: string;
    operation: string;
    context: Record<string, any>;
    constructor(message: string, code: string, operation: string, context: Record<string, any>);
}
export declare class PlatformError extends Error {
    details: {
        platform: 'youtube' | 'spotify';
        code: string;
        message: string;
        context: Record<string, any>;
    };
    constructor(details: {
        platform: 'youtube' | 'spotify';
        code: string;
        message: string;
        context: Record<string, any>;
    });
}
export declare class TranscriptError extends Error {
    source: string;
    url: string;
    originalError?: Error | undefined;
    constructor(message: string, source: string, url: string, originalError?: Error | undefined);
}
//# sourceMappingURL=errors.d.ts.map