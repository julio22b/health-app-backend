import { prisma } from '../../lib/prisma.js';
import type { Prisma, Doctor } from '../generated/prisma/index.js';

export const findDoctorByUsername = async (username: string): Promise<Doctor | null> => {
    const doctor = await prisma.doctor.findUnique({
        where: {
            username,
        },
    });

    return doctor;
};

export const findDoctorById = async (id: number): Promise<Doctor | null> => {
    const doctor = await prisma.doctor.findUnique({
        where: {
            id,
        },
    });

    return doctor;
};

export const createDoctor = async (data: Prisma.DoctorCreateInput): Promise<Doctor> => {
    const doctor = await prisma.doctor.create({
        data,
    });

    return doctor;
};
