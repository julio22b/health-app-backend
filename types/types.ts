import type { Prisma } from '../src/generated/prisma/index.js';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request<object, any, Prisma.PatientCreateInput> {
    doctor?: { id: number };
}

export type { AuthenticatedRequest };
