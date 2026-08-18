import { prisma } from '../lib/prisma';

export const ContactModel = prisma.contact;
export const ContactTagModel = prisma.contactTag;
export const ContactTagMappingModel = prisma.contactTagMapping;
