"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactTagMappingModel = exports.ContactTagModel = exports.ContactModel = void 0;
const prisma_1 = require("../lib/prisma");
exports.ContactModel = prisma_1.prisma.contact;
exports.ContactTagModel = prisma_1.prisma.contactTag;
exports.ContactTagMappingModel = prisma_1.prisma.contactTagMapping;
//# sourceMappingURL=contactModel.js.map