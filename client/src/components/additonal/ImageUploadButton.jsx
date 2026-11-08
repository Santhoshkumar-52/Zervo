import { useRef, useState } from "react";

import { uploadImage } from "@/api/upload/uploadApi";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/utils/notification";

// Same rules as the server (middleware/upload/imageUpload.js).
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/**
 * A button that opens the file picker, uploads the chosen image through
 * POST /api/upload/image and hands back the hosted URL.
 *
 *   <ImageUploadButton
 *     folder="branches"                       // branches | avatars | general
 *     onUploaded={(url) => setValue("logo", url, { shouldDirty: true })}
 *     onUploadingChange={setIsUploading}      // optional: disable Save meanwhile
 *   >
 *     Upload logo
 *   </ImageUploadButton>
 *
 * Nothing is saved by this button: `onUploaded` receives the URL and the
 * parent decides what to do with it (usually put it in a form and let the
 * normal Save button write it to the database).
 */
function ImageUploadButton({
  onUploaded,
  onUploadingChange,
  folder = "general",
  disabled = false,
  variant = "outline",
  size = "sm",
  className,
  successMessage = "Image uploaded",
  children = "Upload image",
}) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const setUploading = (value) => {
    setIsUploading(value);
    onUploadingChange?.(value);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];

    // Clear the input so picking the same file again still fires onChange.
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      notifyError("Only JPG, PNG, WEBP or GIF images are allowed");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      notifyError(`Image is too large. The maximum size is ${MAX_SIZE_MB} MB`);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadImage(file, { folder });

      onUploaded?.(result.url, result);
      notifySuccess(successMessage);
    } catch (error) {
      notifyError(getApiError(error, "Failed to upload image"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
      />

      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : children}
      </Button>
    </>
  );
}

export default ImageUploadButton;
