import { prisma } from '../../lib/prisma.js';
import type { Prisma, Patient } from '../generated/prisma/index.js';

export const createPatient = async (data: Prisma.PatientCreateInput): Promise<Patient> => {
    const createdPatient = await prisma.patient.create({
        data,
    });

    return createdPatient;
};

export const findPatient = async (id: number): Promise<Patient | null> => {
    const patient = await prisma.patient.findUnique({
        where: {
            id,
        },
    });

    return patient;
};

export const findPatients = async (doctorId: number): Promise<Patient[]> => {
    const patients = await prisma.patient.findMany({
        where: {
            doctor_id: doctorId,
        },
    });

    return patients;
};
