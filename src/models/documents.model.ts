import { Document, Prisma } from 'generated/prisma/index.js';
import { prisma } from 'src/lib/prisma.js';

export const createDocument = async (data: Prisma.DocumentCreateInput): Promise<Document> => {
    const createdDocument = await prisma.document.create({
        data,
    });

    return createdDocument;
};
