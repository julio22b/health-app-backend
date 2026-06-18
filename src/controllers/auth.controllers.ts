import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { type Request, type Response } from 'express';
import { createDoctor, findDoctorByUsername } from '../models/doctor.model.js';
import type { Prisma } from '../generated/prisma/index.js';

const registerDoctor = async (req: Request<object, object, Prisma.DoctorCreateInput>, res: Response): Promise<void> => {
    try {
        const { username, password, name, specialty = '' } = req.body;
        if (!username || !password || !name) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        const existingDoctor = await findDoctorByUsername(username);
        if (existingDoctor) {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const doctor = await createDoctor({
            username,
            password: hashedPassword,
            name,
            specialty,
        });

        const token = jwt.sign({ id: doctor.id, username: doctor.username }, process.env.JWT_SECRET!, {
            expiresIn: '24h',
        });

        const { password: _, ...doctorWithoutPassword } = doctor;

        res.status(201).json({
            message: 'Doctor registered successfully',
            token,
            doctor: doctorWithoutPassword,
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};

const loginDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        const doctor = await findDoctorByUsername(username);

        if (!doctor) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, doctor.password);

        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const { password: _, ...doctorWithoutPassword } = doctor;

        const token = jwt.sign({ id: doctor.id, username: doctor.username }, process.env.JWT_SECRET!, {
            expiresIn: '24h',
        });

        res.status(200).json({ message: 'Login successful', doctor: doctorWithoutPassword, token });
    } catch (_) {
        res.status(500).json({ error: 'Something went wrong' });
    }
};

export default { registerDoctor, loginDoctor };
