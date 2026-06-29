import express from 'express';
import { upload } from '../config/multer.js';
import consultationsControllers from '../controllers/consultations.controllers.js';

const router = express.Router();

router.post('/', upload.single('audioFile'), consultationsControllers.createConsultation);

router.post('/process', consultationsControllers.processConsultation);

export default router;
