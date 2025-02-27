"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.types = exports.CLAUDE_PROMPTS = exports.buildYouTubeUrl = exports.isYouTubeUrl = exports.extractYouTubeVideoId = exports.errors = exports.ValidationError = exports.DatabaseError = exports.UpdateFeedbackSchema = exports.CreateFeedbackSchema = exports.FeedbackStatusSchema = exports.FeedbackTypeSchema = exports.PodcastJobSchema = exports.PodcastSchema = exports.getTimestampFieldForStatus = exports.isValidStatus = exports.createStatusHistoryEntry = exports.createStatusUpdatePayload = exports.mapStatusToClient = exports.getStatusColor = exports.formatStatusForDisplay = exports.ProcessingStatus = void 0;
// Status types and utilities
var status_1 = require("./server/types/status");
Object.defineProperty(exports, "ProcessingStatus", { enumerable: true, get: function () { return status_1.ProcessingStatus; } });
var status_2 = require("./transforms/status");
Object.defineProperty(exports, "formatStatusForDisplay", { enumerable: true, get: function () { return status_2.formatStatusForDisplay; } });
Object.defineProperty(exports, "getStatusColor", { enumerable: true, get: function () { return status_2.getStatusColor; } });
Object.defineProperty(exports, "mapStatusToClient", { enumerable: true, get: function () { return status_2.mapStatusToClient; } });
var status_manager_1 = require("./utils/status-manager");
Object.defineProperty(exports, "createStatusUpdatePayload", { enumerable: true, get: function () { return status_manager_1.createStatusUpdatePayload; } });
Object.defineProperty(exports, "createStatusHistoryEntry", { enumerable: true, get: function () { return status_manager_1.createStatusHistoryEntry; } });
Object.defineProperty(exports, "isValidStatus", { enumerable: true, get: function () { return status_manager_1.isValidStatus; } });
Object.defineProperty(exports, "getTimestampFieldForStatus", { enumerable: true, get: function () { return status_manager_1.getTimestampFieldForStatus; } });
// Podcast types and schemas
var podcast_1 = require("./server/schemas/entities/podcast");
Object.defineProperty(exports, "PodcastSchema", { enumerable: true, get: function () { return podcast_1.PodcastSchema; } });
var podcast_2 = require("./server/schemas/jobs/podcast");
Object.defineProperty(exports, "PodcastJobSchema", { enumerable: true, get: function () { return podcast_2.PodcastJobSchema; } });
var feedback_1 = require("./server/schemas/entities/feedback");
Object.defineProperty(exports, "FeedbackTypeSchema", { enumerable: true, get: function () { return feedback_1.FeedbackTypeSchema; } });
Object.defineProperty(exports, "FeedbackStatusSchema", { enumerable: true, get: function () { return feedback_1.FeedbackStatusSchema; } });
Object.defineProperty(exports, "CreateFeedbackSchema", { enumerable: true, get: function () { return feedback_1.CreateFeedbackSchema; } });
Object.defineProperty(exports, "UpdateFeedbackSchema", { enumerable: true, get: function () { return feedback_1.UpdateFeedbackSchema; } });
// Errors
var errors_1 = require("./server/errors");
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return errors_1.DatabaseError; } });
var errors_2 = require("./server/errors/errors");
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_2.ValidationError; } });
exports.errors = __importStar(require("./server/errors"));
// Re-export transcript types
__exportStar(require("./server/types/transcript"), exports);
// Jobs
__exportStar(require("./types/jobs"), exports);
// URL utilities
var url_utils_1 = require("./utils/url-utils");
Object.defineProperty(exports, "extractYouTubeVideoId", { enumerable: true, get: function () { return url_utils_1.extractYouTubeVideoId; } });
Object.defineProperty(exports, "isYouTubeUrl", { enumerable: true, get: function () { return url_utils_1.isYouTubeUrl; } });
Object.defineProperty(exports, "buildYouTubeUrl", { enumerable: true, get: function () { return url_utils_1.buildYouTubeUrl; } });
// Claude prompts
var claude_prompts_1 = require("./common/prompts/claude-prompts");
Object.defineProperty(exports, "CLAUDE_PROMPTS", { enumerable: true, get: function () { return claude_prompts_1.CLAUDE_PROMPTS; } });
// Namespace exports (use with caution - these might re-export duplicates)
exports.types = __importStar(require("./server/types"));
exports.schemas = __importStar(require("./server/schemas"));
//# sourceMappingURL=index.js.map