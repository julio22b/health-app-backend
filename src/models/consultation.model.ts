import { prisma } from '../../lib/prisma.js';
import type { Consultation, Prisma } from '../generated/prisma/index.js';

export const createConsultation = async (
    data: Prisma.ConsultationCreateInput,
    patientId: number,
): Promise<Consultation> => {
    const [consultation] = await prisma.$transaction([
        prisma.consultation.create({
            data,
        }),
        prisma.patient.update({
            where: {
                id: patientId,
            },
            data: {
                last_visit: new Date(),
            },
        }),
    ]);

    return consultation;
};
