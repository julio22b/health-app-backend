import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            doctor?: string | JwtPayload<{ id: string; username: string }>;
        }
    }
}
