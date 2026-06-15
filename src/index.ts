process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});
import 'dotenv/config';
import express, { type Request, type Response, type Application, type NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes.js';
import patientsRouter from './routes/patients.routes.js';
import { authenticationMiddleware } from './middleware/auth.middleware.js';

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
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
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);

app.use('/auth', authRouter);
app.use('/patients', authenticationMiddleware, patientsRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Error. Check logs.');
});

app.listen(PORT, (): void => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
