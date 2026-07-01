import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    },
});
