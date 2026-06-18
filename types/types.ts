import type { Request } from 'express';

interface AuthenticatedRequest<T = object> extends Request<object, object, T> {
    doctor?: { id: number };
}

interface CreateConsultationBody {
    patientId: string;
}

interface ProcessConsultationBody {
    consultationId: string;
}

export type { AuthenticatedRequest, CreateConsultationBody, ProcessConsultationBody };
