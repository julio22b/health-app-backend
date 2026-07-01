import { type Response } from 'express';
import {
    changeConsultationStatus,
    createConsultation as createConsultationInDB,
    searchConsultationById,
    updateConsultation,
} from '../models/consultation.model.js';
import type { AuthenticatedRequest, CreateConsultationBody, ProcessConsultationBody } from '../types/types.js';
import { uploadFromBuffer, deleteFromCloudinary, extractCloudinaryPublicId } from '../config/cloudinary.js';
import openai from '../config/openai.js';
import { toFile } from 'openai';
import { createDocument } from '../models/documents.model.js';
import { isOwnedByDoctor } from '../lib/authorization.js';

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
        const audioBlob = await audioResponse.blob();

        // const transcript = await openai.audio.transcriptions.create({
        //     file: await toFile(audioBlob, 'consultation.webm', { type: 'audio/webm' }),
        //     model: 'whisper-1',
        //     language: 'es',
        // });

        // console.log(transcript);

        // const gptDocument = await openai.chat.completions.create({
        //     model: 'gpt-4o',
        //     messages: [
        //         {
        //             role: 'system',
        //             content: `You are a clinical documentation assistant. Based on the consultation transcript provided, generate a structured medical document in Spanish. Document type: ${documentType}

        //             Guidelines per type:
        //             - MEDICAL_HISTORY: Include chief complaint, history of present illness, past medical history, medications, allergies, family history, social history, review of systems, physical examination findings, and assessment.
        //             - PROGRESS_NOTE: Follow SOAP format — Subjective, Objective, Assessment, Plan.
        //             - DISCHARGE_SUMMARY: Include admission date, discharge date, diagnosis, procedures performed, hospital course, discharge condition, and follow-up instructions.

        //             Return only the document content in plain text. Do not include any preamble or explanation.`,
        //         },
        //         { role: 'user', content: transcript.text },
        //     ],
        // });
        // MOCK - remove when OpenAI billing is sorted
        const transcript = {
            text: 'Paciente masculino de 45 años que consulta por dolor abdominal de 3 días de evolución. Refiere dolor en epigastrio, náuseas y fiebre de 38.5°C. Sin antecedentes de importancia.',
        };

        const gptDocument = {
            choices: [
                {
                    message: {
                        content: `HISTORIA MÉDICA

Fecha: ${new Date().toLocaleDateString('es-VE')}
Paciente: ${consultation.patient?.name}

MOTIVO DE CONSULTA:
Dolor abdominal de 3 días de evolución.

ENFERMEDAD ACTUAL:
Paciente refiere dolor en epigastrio de inicio hace 3 días, de carácter opresivo, intensidad 7/10, acompañado de náuseas y fiebre de 38.5°C.

EVALUACIÓN:
Abdomen doloroso a la palpación en epigastrio. Murphy negativo. Sin signos de irritación peritoneal.

PLAN:
- Laboratorios: BHC, QS, amilasa, lipasa
- Ecografía abdominal
- Analgesia y antieméticos
- Control en 24 horas`,
                    },
                },
            ],
        };

        if (!gptDocument.choices[0].message.content) {
            const failedDocument = await changeConsultationStatus('FAILED', Number(consultationId));
            res.status(400).json({ error: 'Document creation failed', document: failedDocument });
            return;
        }

        console.log(gptDocument.choices[0].message.content);

        const document = await createDocument({
            consultation: {
                connect: { id: Number(consultationId) },
            },
            type: req.body.documentType,
            content: gptDocument.choices[0].message.content,
        });

        const completedConsultation = await changeConsultationStatus('COMPLETED', Number(consultationId));

        res.status(200).json({
            message: 'Consultation processed successfully',
            document,
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
