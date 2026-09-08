const multer = require('multer');

/**
 * Multer configuration for secure resume uploads.
 *
 * Security decisions:
 * - memoryStorage(): File arrives as Buffer in req.file.buffer, allowing
 *   validation/hashing in memory BEFORE any disk write.
 * - 5 MB limit: Prevents disk exhaustion via large uploads.
 * - fileFilter: Cheap first-pass filter on mimetype + extension.
 *   REAL validation happens in controller via isValidPdf() magic-byte check,
 *   since fileFilter alone can be trivially spoofed.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = file.originalname?.toLowerCase().endsWith('.pdf');

  if (isPdfMime && isPdfExt) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

const uploadResumeFile = upload.single('resume');

/**
 * Error-wrapping middleware for multer errors.
 * Multer calls next(err) on failure — this catches those errors
 * and converts them to our standard JSON shape.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function handleUploadError(err, req, res, next) {
  if (!err) {
    return next();
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large, maximum size is 5MB',
    });
  }

  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only PDF files are allowed',
    });
  }

  return res.status(400).json({
    success: false,
    message: 'File upload failed',
  });
}

module.exports = { uploadResumeFile, handleUploadError };
