import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
    storage: storage,
    fileFilter: (_, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    },
});
