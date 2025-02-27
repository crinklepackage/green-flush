"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingStatus = void 0;
// Server-side processing status (matches DB)
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["IN_QUEUE"] = "in_queue";
    ProcessingStatus["FETCHING_TRANSCRIPT"] = "fetching_transcript";
    ProcessingStatus["GENERATING_SUMMARY"] = "generating_summary";
    ProcessingStatus["COMPLETED"] = "completed";
    ProcessingStatus["FAILED"] = "failed";
})(ProcessingStatus || (exports.ProcessingStatus = ProcessingStatus = {}));
//# sourceMappingURL=status.js.map