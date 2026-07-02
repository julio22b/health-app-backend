import { type Response } from 'express';
import {
    changeConsultationStatus,
    createConsultation as createConsultationInDB,
    searchConsultationById,
    updateConsultation,
} from '../models/consultation.model.js';
import type { AuthenticatedRequest, CreateConsultationBody, ProcessConsultationBody } from '../types/types.js';
import { uploadFromBuffer, deleteFromCloudinary, extractCloudinaryPublicId } from '../config/cloudinary.js';
import { createDocument } from '../models/documents.model.js';
import { isOwnedByDoctor } from '../lib/authorization.js';
import genai, { getSystemPrompt } from '../config/gemini.js';
import { Type } from '@google/genai';

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
    console.log('processConsultation hit', req.body);

    try {
        const { consultationId, documentType } = req.body;

        const consultation = await searchConsultationById(Number(consultationId));
        if (!consultation) {
            res.status(400).json({ error: 'Consultation does not exist' });
            return;
        }

        if (!isOwnedByDoctor(res, consultation.patient.doctor_id, req.doctor!.id)) {
            return;
        }

        if (!consultation.audio_url) {
            res.status(400).json({ error: 'Consultation has no audio file' });
            return;
        }

        await changeConsultationStatus('PROCESSING', Number(consultationId));

        const audioResponse = await fetch(consultation.audio_url);
        const mimeType = audioResponse.headers.get('content-type') ?? 'audio/webm';
        const arrayBuffer = await audioResponse.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        const result = await genai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
                {
                    text: getSystemPrompt(documentType),
                },
                {
                    inlineData: {
                        mimeType,
                        data: base64Audio,
                    },
                },
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        transcript: { type: Type.STRING },
                        document: { type: Type.STRING },
                    },
                    required: ['transcript', 'document'],
                },
            },
        });

        if (!result.text) {
            console.error('Error generating content:', result);
            const failedDocument = await changeConsultationStatus('FAILED', Number(consultationId));
            res.status(500).json({ error: 'Error generating content', document: failedDocument });
            return;
        }

        const { transcript, document } = JSON.parse(result.text);

        const createdDocument = await createDocument({
            consultation: {
                connect: { id: Number(consultationId) },
            },
            type: req.body.documentType,
            content: document,
        });

        const completedConsultation = await updateConsultation(
            { transcript_text: transcript, status: 'COMPLETED' },
            Number(consultationId),
        );

        res.status(200).json({
            message: 'Consultation processed successfully',
            document: createdDocument,
            consultation: completedConsultation,
        });
    } catch (error) {
        console.error('Process consultation error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const uploadConsultationAudio = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (!req.file) {
            res.status(400).json({ error: 'Audio file is required' });
            return;
        }

        const consultation = await searchConsultationById(id);
        if (!consultation) {
            res.status(400).json({ error: 'Consultation does not exist' });
            return;
        }

        if (!isOwnedByDoctor(res, consultation.patient.doctor_id, req.doctor!.id)) {
            return;
        }

        const oldPublicId = consultation.audio_url ? extractCloudinaryPublicId(consultation.audio_url) : null;

        const audioUpload = await uploadFromBuffer(req.file.buffer);

        let updatedConsultation;
        try {
            // NOTE: consultation status is intentionally left unchanged here.
            // status ideally belongs at the document level since one consultation
            // can have multiple documents in different states. Kept at consultation
            // level for v1 simplicity.
            updatedConsultation = await updateConsultation({ audio_url: audioUpload.secure_url }, id);
        } catch (dbError) {
            deleteFromCloudinary(audioUpload.public_id).catch((err) =>
                console.error('Failed to delete orphaned Cloudinary asset:', err),
            );
            throw dbError;
        }

        if (oldPublicId) {
            deleteFromCloudinary(oldPublicId).catch((err) =>
                console.error('Failed to delete old Cloudinary asset:', err),
            );
        }

        res.status(200).json({
            message: 'Consultation audio uploaded successfully',
            consultation: updatedConsultation,
        });
    } catch (error) {
        console.error('Upload consultation audio error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

export default { createConsultation, processConsultation, uploadConsultationAudio };
