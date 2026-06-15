import { type Response } from 'express';
import { findDoctorById } from '../models/doctor.model.js';
import { createPatient as createPatientInDB, findPatients } from '../models/patient.model.js';
import type { AuthenticatedRequest } from '../../types/types.js';

const getPatients = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const patients = await findPatients(req.doctor!.id);

        res.status(200).json({ patients });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const createPatient = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, date_of_birth, gender } = req.body;

        const doctorId = req.doctor?.id;

        if (!name || !date_of_birth || !gender || !doctorId) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        const doctor = await findDoctorById(doctorId);

        const patient = await createPatientInDB({
            name,
            date_of_birth: new Date(date_of_birth),
            gender,
            doctor: {
                connect: { id: doctor!.id },
            },
        });

        res.status(201).json({ message: 'Patient created successfully', patient });
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

export default { createPatient, getPatients };
