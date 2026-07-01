import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export const uploadFromBuffer = (buffer: Buffer): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: 'video' }, (error, result) => {
            if (error) reject(error);
            else resolve(result!);
        });
        stream.end(buffer);
    });
};

export const deleteFromCloudinary = (publicId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: 'video' }, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
};

// Extracts the Cloudinary public_id from a standard upload URL.
// URL shape: https://res.cloudinary.com/{cloud}/video/upload/v{ver}/{public_id}.{ext}
export const extractCloudinaryPublicId = (url: string): string | null => {
    try {
        const afterUpload = new URL(url).pathname.split('/upload/')[1];
        if (!afterUpload) return null;
        return afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
    } catch {
        return null;
    }
};

export default cloudinary;
