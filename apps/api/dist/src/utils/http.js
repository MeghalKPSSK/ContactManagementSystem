"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paramStr = void 0;
/** Coerces an Express route/query param (string | string[] | undefined) to a plain string. */
const paramStr = (value) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
exports.paramStr = paramStr;
//# sourceMappingURL=http.js.map