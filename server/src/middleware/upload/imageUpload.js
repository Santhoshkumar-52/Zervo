const multer = require("multer");

const { errorResponse } = require("../../utils/response");

const MAX_IMAGE_SIZE_MB = 5;

// SVG is left out on purpose: it can carry scripts.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  // Keep the file in memory, it is streamed straight to Cloudinary.
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG, WEBP or GIF images are allowed");
      error.code = "INVALID_IMAGE_TYPE";

      return cb(error);
    }

    return cb(null, true);
  },
});

// Reads one image from the multipart field "image" into req.file.
// Upload problems are answered here as normal API errors.
const singleImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "INVALID_IMAGE_TYPE") {
      return errorResponse(res, error.message, 400);
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(
        res,
        `Image is too large. The maximum size is ${MAX_IMAGE_SIZE_MB} MB`,
        413,
      );
    }

    if (error instanceof multer.MulterError) {
      return errorResponse(
        res,
        'Upload one image in the form field "image"',
        400,
      );
    }

    console.error("Image upload middleware error:", error);

    return errorResponse(res, "Failed to read the uploaded image", 500);
  });
};

module.exports = { singleImage };
