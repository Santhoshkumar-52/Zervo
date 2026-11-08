const express = require("express");

const { uploadImage } = require("../../controller/uploadController/controller");
const { singleImage } = require("../../middleware/upload/imageUpload");

const router = express.Router();

// tokenVerify is applied in routes/index.js, so only logged-in users get here.
//
// POST /api/upload/image -> multipart/form-data
//                           image  (file, required), folder (optional)
//                           Response: { data: { url, publicId, width, height,
//                                                format, bytes } }
router.post("/image", singleImage, uploadImage);

module.exports = router;
