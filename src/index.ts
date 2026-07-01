process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});
import 'dotenv/config';
import express, { type Request, type Response, type Application, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes.js';
import patientsRouter from './routes/patients.routes.js';
import consultationsRouter from './routes/consultations.routes.js';
import documentsRouter from './routes/documents.routes.js';
import { authenticationMiddleware } from './middleware/auth.middleware.js';

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const requiredEnv = [
    'JWT_SECRET',
    'DATABASE_URL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'GEN_AI_API_KEY',
];
for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
        console.error(`FATAL ERROR: ${envVar} is not defined in environment variables`);
        process.exit(1);
    }
}

const origin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(express.json());
app.use(
    cors({
        origin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);

app.use('/auth', authRouter);
app.use('/patients', authenticationMiddleware, patientsRouter);
app.use('/consultations', authenticationMiddleware, consultationsRouter);
app.use('/documents', authenticationMiddleware, documentsRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Error. Check logs.');
});

app.listen(PORT, (): void => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
