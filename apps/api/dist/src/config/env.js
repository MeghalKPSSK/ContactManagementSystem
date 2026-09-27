"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = require("dotenv");
// Support both source (tsx) and compiled (dist) execution layouts.
const envCandidates = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(__dirname, '../../../../.env'),
    path_1.default.resolve(__dirname, '../../../../../.env'),
];
const envPath = envCandidates.find((candidate) => fs_1.default.existsSync(candidate));
if (envPath) {
    (0, dotenv_1.config)({ path: envPath });
}
//# sourceMappingURL=env.js.map