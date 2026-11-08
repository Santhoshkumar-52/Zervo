const { isConfigured, uploadImageBuffer } = require("../../config/cloudinary");
const { successResponse, errorResponse } = require("../../utils/response");

// Cloudinary folders a client may upload into (body field "folder").
const FOLDERS = ["branches", "avatars", "general"];
const DEFAULT_FOLDER = "general";

// POST /api/upload/image   multipart/form-data
//   image   the image file (required, JPG / PNG / WEBP / GIF, max 5 MB)
//   folder  optional: branches | avatars | general (default general)
// -> { url, publicId, width, height, format, bytes }
//
// The image is read by the singleImage middleware (req.file), uploaded to
// Cloudinary, and the hosted URL is returned for the client to save wherever
// it needs (for example branches.logo).
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Image is required (form field "image")', 400);
    }

    const folder = req.body?.folder || DEFAULT_FOLDER;

    if (!FOLDERS.includes(folder)) {
      return errorResponse(
        res,
        `folder must be one of: ${FOLDERS.join(", ")}`,
        400,
      );
    }

    if (!isConfigured()) {
      console.error("Cloudinary env vars are missing");

      return errorResponse(res, "Image upload is not configured", 500);
    }

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: `zervo/${folder}`,
    });

    return successResponse(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      "Image uploaded successfully",
      201,
    );
  } catch (error) {
    console.error("Error uploading image:", error);

    return errorResponse(res, "Failed to upload image", 500);
  }
};

module.exports = { uploadImage };
