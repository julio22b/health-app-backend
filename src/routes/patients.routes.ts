import express from 'express';
import patientsControllers from '../controllers/patients.controllers.js';
const router = express.Router();

router.get('/', patientsControllers.getPatients);

router.post('/', patientsControllers.createPatient);

export default router;
