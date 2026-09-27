"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.getErrorMessage = getErrorMessage;
exports.getErrorStatus = getErrorStatus;
// Application error carrying an HTTP status code, used to short-circuit controller responses.
class AppError extends Error {
    status;
    constructor(message, status = 500) {
        super(message);
        this.name = 'AppError';
        this.status = status;
    }
}
exports.AppError = AppError;
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function getErrorStatus(error, fallback = 500) {
    return error instanceof AppError ? error.status : fallback;
}
//# sourceMappingURL=errors.js.map