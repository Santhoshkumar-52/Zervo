const { v2: cloudinary } = require("cloudinary");

let configured = false;

// Configured on first use, so it does not matter whether dotenv has already
// loaded the .env file when this module is first required.
const getCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    configured = true;
  }

  return cloudinary;
};

const isConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

// Uploads an image held in memory (multer's file.buffer) to Cloudinary.
// Resolves with Cloudinary's upload result (secure_url, public_id, ...).
const uploadImageBuffer = (buffer, { folder } = {}) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    stream.end(buffer);
  });

module.exports = { isConfigured, uploadImageBuffer };
