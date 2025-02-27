import { ProcessingStatus } from '../server/types/status';
export declare const mapStatusToClient: (serverStatus: ProcessingStatus) => string;
/**
 * Formats raw database status values into user-friendly display strings
 */
export declare const formatStatusForDisplay: (status: ProcessingStatus) => string;
/**
 * Returns an appropriate color designation for each status
 * Used for visual status indicators in the UI
 */
export declare const getStatusColor: (status: ProcessingStatus) => "blue" | "yellow" | "green" | "red" | "gray";
//# sourceMappingURL=status.d.ts.map