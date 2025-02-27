"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptError = exports.PlatformError = exports.DatabaseError = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class DatabaseError extends Error {
    constructor(message, code, operation, context) {
        super(message);
        this.code = code;
        this.operation = operation;
        this.context = context;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class PlatformError extends Error {
    constructor(details) {
        super(details.message);
        this.details = details;
        this.name = 'PlatformError';
    }
}
exports.PlatformError = PlatformError;
class TranscriptError extends Error {
    constructor(message, source, url, originalError) {
        super(message);
        this.source = source;
        this.url = url;
        this.originalError = originalError;
        this.name = 'TranscriptError';
    }
}
exports.TranscriptError = TranscriptError;
//# sourceMappingURL=errors.js.map