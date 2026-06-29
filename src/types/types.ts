import type { Request } from 'express';
import { DocumentType } from 'generated/prisma/index.js';

interface AuthenticatedRequest<T = object> extends Request<object, object, T> {
    doctor?: { id: number };
}

interface CreateConsultationBody {
    patientId: string;
}

interface ProcessConsultationBody {
    consultationID: string;
    documentType: DocumentType;
}

export type { AuthenticatedRequest, CreateConsultationBody, ProcessConsultationBody };
