import ImageUploadButton from "@/components/additonal/ImageUploadButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

/**
 * Profile photo with Upload / Remove buttons, for forms that have an
 * avatar_url value (staff, members).
 *
 *   <AvatarUploader
 *     value={avatarUrl}                        // current URL or null
 *     name="Asha Rao"                          // initials when there is no photo
 *     onChange={(url) => setValue("avatar_url", url, { shouldDirty: true })}
 *     onUploadingChange={setIsUploading}       // optional
 *     disabled={isSaving}
 *   />
 *
 * `onChange` gets the new Cloudinary URL, or null when the photo is removed.
 * The URL is only stored once the form is saved.
 */
function AvatarUploader({
  value,
  name,
  onChange,
  onUploadingChange,
  folder = "avatars",
  disabled = false,
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarImage src={value ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <ImageUploadButton
            folder={folder}
            disabled={disabled}
            onUploaded={(url) => onChange?.(url)}
            onUploadingChange={onUploadingChange}
            successMessage="Photo uploaded"
          >
            {value ? "Change photo" : "Upload photo"}
          </ImageUploadButton>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange?.(null)}
            >
              Remove
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          JPG, PNG, WEBP or GIF, up to 5 MB. Saved when you save the form.
        </span>
      </div>
    </div>
  );
}

export default AvatarUploader;
