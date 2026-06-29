import { prisma } from '../lib/prisma.js';
import type { Consultation, Prisma, Status } from '../../generated/prisma/index.js';

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

export const searchConsultationById = async (consultationId: number) => {
    return prisma.consultation.findUnique({
        where: { id: consultationId },
        include: { patient: true },
    });
};

export const changeConsultationStatus = async (newStatus: Status, consultationId: number): Promise<Consultation> => {
    const consultation = await prisma.consultation.update({
        where: {
            id: consultationId,
        },
        data: {
            status: newStatus,
        },
        include: { documents: true },
    });

    return consultation;
};
