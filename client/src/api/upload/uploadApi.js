import api from "../axios";

// POST /api/upload/image   (any logged-in user)
// Sends one image to the server, which uploads it to Cloudinary.
// folder: "branches" | "avatars" | "general" (default "general")
// Resolves with { url, publicId, width, height, format, bytes }.
// Save `url` wherever it belongs (branches.logo, users.avatar_url, ...).
export const uploadImage = (file, { folder = "general", onProgress } = {}) => {
  const formData = new FormData();

  formData.append("folder", folder);
  formData.append("image", file);

  return api
    .post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (event) => {
            if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
          }
        : undefined,
    })
    .then((res) => res.data.data);
};
