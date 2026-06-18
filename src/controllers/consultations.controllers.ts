import { type Response } from 'express';
import { createConsultation as createConsultationInDB } from '../models/consultation.model.js';
import type { AuthenticatedRequest, CreateConsultationBody, ProcessConsultationBody } from '../../types/types.js';
import { uploadFromBuffer } from '../config/cloudinary.js';

const createConsultation = async (req: AuthenticatedRequest<CreateConsultationBody>, res: Response) => {
    try {
        const { patientId } = req.body;

        if (!req.file) {
            res.status(400).json({ error: 'Audio file is required' });
            return;
        }

        const audioUpload = await uploadFromBuffer(req.file.buffer);

        const consultation = await createConsultationInDB(
            {
                patient: {
                    connect: { id: Number(patientId) },
                },
                status: 'PENDING',
                audio_url: audioUpload.secure_url,
            },
            Number(patientId),
        );

        res.status(201).json({ message: 'Consultation created successfully', consultation });
    } catch (error) {
        console.error('Create consultation error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const processConsultation = async (req: AuthenticatedRequest<ProcessConsultationBody>, res: Response) => {
    try {
        const { consultationId } = req.body;
    } catch (error) {
        console.error('Process consultation error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

export default { createConsultation, processConsultation };
