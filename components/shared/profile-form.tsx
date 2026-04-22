"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ImagePlusIcon,
  Loader2Icon,
  ZoomInIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { z } from "zod";

import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFileViaServer } from "@/lib/client-upload";
import { UserRecord } from "@/models/User";
import { updateProfile } from "@/store/features/user/user-slice";

const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_PREVIEW_SIZE = 280;
const DEFAULT_AVATAR_POSITION = { x: 50, y: 50 };

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  bio: z.string().max(500).optional(),
  userImage: z.string().url().optional().or(z.literal("")),
  skills: z.string().optional(),
  interests: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type AvatarPosition = {
  x: number;
  y: number;
};

type AvatarDraft = {
  src: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
};

type AvatarPlacement = {
  width: number;
  height: number;
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAvatarPlacement({
  boxSize,
  naturalWidth,
  naturalHeight,
  position,
  zoom,
}: {
  boxSize: number;
  naturalWidth: number;
  naturalHeight: number;
  position: AvatarPosition;
  zoom: number;
}): AvatarPlacement {
  const baseScale = Math.max(boxSize / naturalWidth, boxSize / naturalHeight);
  const scaledWidth = naturalWidth * baseScale * zoom;
  const scaledHeight = naturalHeight * baseScale * zoom;
  const overflowX = Math.max(0, scaledWidth - boxSize);
  const overflowY = Math.max(0, scaledHeight - boxSize);

  return {
    width: scaledWidth,
    height: scaledHeight,
    left: -overflowX * (position.x / 100),
    top: -overflowY * (position.y / 100),
  };
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load the selected image."));
    image.src = src;
  });
}

async function createCroppedAvatarBlob({
  src,
  naturalWidth,
  naturalHeight,
  position,
  zoom,
}: {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  position: AvatarPosition;
  zoom: number;
}) {
  const image = await loadImageElement(src);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to prepare the avatar preview.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const placement = getAvatarPlacement({
    boxSize: AVATAR_OUTPUT_SIZE,
    naturalWidth,
    naturalHeight,
    position,
    zoom,
  });

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    placement.left,
    placement.top,
    placement.width,
    placement.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  if (!blob) {
    throw new Error("Failed to create the cropped avatar image.");
  }

  return blob;
}

type ProfilePatchResponse = {
  error?: string;
  user?: {
    name?: string;
    bio?: string;
    userImage?: string;
    skills?: string[];
    interests?: string[];
  };
};

export function ProfileForm({ user }: { user: Partial<UserRecord> }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(
    null,
  );
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft | null>(null);
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>(
    DEFAULT_AVATAR_POSITION,
  );
  const [avatarZoom, setAvatarZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const defaultSkills = user.skills?.join(", ") || "";
  const defaultInterests = user.interests?.join(", ") || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      bio: user.bio || "",
      userImage: user.userImage || "",
      skills: defaultSkills,
      interests: defaultInterests,
    },
  });

  const currentUserImage = watch("userImage");
  const currentName = watch("name");

  const avatarPreviewPlacement = useMemo(() => {
    if (!avatarDraft) {
      return null;
    }

    return getAvatarPlacement({
      boxSize: AVATAR_PREVIEW_SIZE,
      naturalWidth: avatarDraft.naturalWidth,
      naturalHeight: avatarDraft.naturalHeight,
      position: avatarPosition,
      zoom: avatarZoom,
    });
  }, [avatarDraft, avatarPosition, avatarZoom]);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const clearAvatarDraft = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    setAvatarDraft(null);
    setAvatarPosition(DEFAULT_AVATAR_POSITION);
    setAvatarZoom(1);
    setImageUploadProgress(null);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  const nudgeAvatar = useCallback((axis: "x" | "y", delta: number) => {
    setAvatarPosition((current) => ({
      ...current,
      [axis]: clamp(current[axis] + delta, 0, 100),
    }));
  }, []);

  const handleAvatarDialogOpenChange = useCallback(
    (open: boolean) => {
      if (isUploadingImage) {
        return;
      }

      setIsAvatarDialogOpen(open);

      if (!open) {
        clearAvatarDraft();
      }
    },
    [clearAvatarDraft, isUploadingImage],
  );

  async function persistAvatar(userImage: string) {
    const response = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userImage }),
    });

    const data = (await response.json()) as ProfilePatchResponse;

    if (!response.ok) {
      throw new Error(data.error || "Failed to save avatar.");
    }

    return data.user;
  }

  async function handleImageSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      resetFileInput();
      return;
    }

    if (file.size > AVATAR_MAX_FILE_BYTES) {
      toast.error("Avatar image must be 5MB or smaller.");
      resetFileInput();
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await loadImageElement(objectUrl);

      clearAvatarDraft();
      avatarObjectUrlRef.current = objectUrl;

      setAvatarDraft({
        src: objectUrl,
        fileName: file.name,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      setAvatarPosition(DEFAULT_AVATAR_POSITION);
      setAvatarZoom(1);
      setIsAvatarDialogOpen(true);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to prepare the selected image.",
      );
    } finally {
      resetFileInput();
    }
  }

  async function handleAvatarUpload() {
    if (!avatarDraft) {
      return;
    }

    setIsUploadingImage(true);
    setImageUploadProgress(0);

    try {
      const croppedBlob = await createCroppedAvatarBlob({
        src: avatarDraft.src,
        naturalWidth: avatarDraft.naturalWidth,
        naturalHeight: avatarDraft.naturalHeight,
        position: avatarPosition,
        zoom: avatarZoom,
      });

      const croppedFile = new File(
        [croppedBlob],
        `avatar-${Date.now()}-${avatarDraft.fileName.replace(/\.[^.]+$/, "")}.jpg`,
        { type: "image/jpeg" },
      );

      const uploaded = await uploadFileViaServer<{ secure_url: string }>(
        croppedFile,
        {
          onProgress: ({ percent }) => {
            setImageUploadProgress(percent);
          },
        },
      );

      const persistedUser = await persistAvatar(uploaded.secure_url);
      const nextImage = persistedUser?.userImage || uploaded.secure_url;

      setValue("userImage", nextImage, {
        shouldDirty: true,
        shouldValidate: true,
      });
      dispatch(updateProfile({ userImage: nextImage }));
      toast.success("Avatar updated successfully!");
      setIsAvatarDialogOpen(false);
      clearAvatarDraft();
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload avatar.",
      );
    } finally {
      setIsUploadingImage(false);
      setImageUploadProgress(null);
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);

    try {
      const skillsArray = data.skills
        ? data.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
        : [];
      const interestsArray = data.interests
        ? data.interests
            .split(",")
            .map((interest) => interest.trim())
            .filter(Boolean)
        : [];

      const payload = {
        name: data.name,
        bio: data.bio,
        userImage: data.userImage,
        skills: skillsArray,
        interests: interestsArray,
      };

      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ProfilePatchResponse;

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      dispatch(
        updateProfile({
          name: result.user?.name ?? data.name,
          userImage: result.user?.userImage ?? data.userImage,
        }),
      );
      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while updating your profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <input type="hidden" {...register("userImage")} />

        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {currentUserImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUserImage}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">
                {(currentName || "U").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelection}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingImage ? "Preparing..." : "Change Avatar"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Choose an image up to 5MB. You will be able to crop and reposition it
              before posting.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name / Display Name</Label>
          <Input
            id="name"
            placeholder="Enter your full name"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-[0.8rem] font-medium text-destructive">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a little bit about yourself (max 500 characters)"
            className="resize-none"
            {...register("bio")}
          />
          <p className="text-[0.8rem] text-muted-foreground">
            Brief description for your profile. URLs are hyperlinked.
          </p>
          {errors.bio ? (
            <p className="text-[0.8rem] font-medium text-destructive">
              {errors.bio.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              placeholder="Physics, Calculus, Algorithms..."
              {...register("skills")}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Comma-separated list of tags.
            </p>
            {errors.skills ? (
              <p className="text-[0.8rem] font-medium text-destructive">
                {errors.skills.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Interests</Label>
            <Input
              id="interests"
              placeholder="AI, Board Games, Literature..."
              {...register("interests")}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Comma-separated list of tags.
            </p>
            {errors.interests ? (
              <p className="text-[0.8rem] font-medium text-destructive">
                {errors.interests.message}
              </p>
            ) : null}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </form>

      <Dialog
        open={isAvatarDialogOpen}
        onOpenChange={handleAvatarDialogOpenChange}
      >
        <DialogContent
          className="max-w-3xl overflow-hidden p-0 sm:max-w-3xl"
          showCloseButton={!isUploadingImage}
        >
          <div className="border-b border-border/70 bg-muted/15 px-6 py-5">
            <DialogHeader>
              <DialogTitle>Preview and crop your profile photo</DialogTitle>
              <DialogDescription>
                Move the image until it fits naturally inside the circle, then post
                it as your new avatar.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/[0.08] via-background to-background p-4 shadow-sm">
                <div className="mx-auto flex w-fit flex-col items-center gap-4">
                  <div className="relative h-[280px] w-[280px] overflow-hidden rounded-full border-4 border-background bg-muted shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
                    {avatarDraft && avatarPreviewPlacement ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarDraft.src}
                          alt="Avatar crop preview"
                          className="absolute max-w-none select-none"
                          draggable={false}
                          style={{
                            width: `${avatarPreviewPlacement.width}px`,
                            height: `${avatarPreviewPlacement.height}px`,
                            left: `${avatarPreviewPlacement.left}px`,
                            top: `${avatarPreviewPlacement.top}px`,
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-border/60" />
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImagePlusIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <p className="max-w-[260px] text-center text-xs leading-5 text-muted-foreground">
                    This circular preview shows exactly how your profile photo will
                    appear in the app.
                  </p>
                </div>
              </div>

              {isUploadingImage && imageUploadProgress !== null ? (
                <UploadProgressBar
                  label="Uploading avatar"
                  value={imageUploadProgress}
                  detail="Uploading the cropped image and saving it to your profile."
                />
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ZoomInIcon className="size-4 text-primary" />
                  Zoom
                </div>
                <div className="mt-4 space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.01"
                    value={avatarZoom}
                    disabled={isUploadingImage}
                    onChange={(event) =>
                      setAvatarZoom(Number.parseFloat(event.target.value))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Fit</span>
                    <span>{avatarZoom.toFixed(2)}x</span>
                    <span>Close-up</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Move Image</p>
                    <p className="text-xs text-muted-foreground">
                      Adjust left, right, top, and bottom to center the photo inside
                      the circle.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploadingImage}
                    onClick={() => {
                      setAvatarZoom(1);
                      setAvatarPosition(DEFAULT_AVATAR_POSITION);
                    }}
                  >
                    Reset
                  </Button>
                </div>

                <div className="mt-5 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-2">
                    <div />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isUploadingImage}
                      onClick={() => nudgeAvatar("y", -5)}
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <div />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isUploadingImage}
                      onClick={() => nudgeAvatar("x", -5)}
                    >
                      <ArrowLeftIcon className="size-4" />
                    </Button>
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 px-3 text-[11px] text-muted-foreground">
                      Move
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isUploadingImage}
                      onClick={() => nudgeAvatar("x", 5)}
                    >
                      <ArrowRightIcon className="size-4" />
                    </Button>
                    <div />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isUploadingImage}
                      onClick={() => nudgeAvatar("y", 5)}
                    >
                      <ArrowDownIcon className="size-4" />
                    </Button>
                    <div />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="avatar-horizontal">Horizontal</Label>
                    <input
                      id="avatar-horizontal"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={avatarPosition.x}
                      disabled={isUploadingImage}
                      onChange={(event) =>
                        setAvatarPosition((current) => ({
                          ...current,
                          x: Number.parseInt(event.target.value, 10),
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Left</span>
                      <span>{avatarPosition.x}%</span>
                      <span>Right</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar-vertical">Vertical</Label>
                    <input
                      id="avatar-vertical"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={avatarPosition.y}
                      disabled={isUploadingImage}
                      onChange={(event) =>
                        setAvatarPosition((current) => ({
                          ...current,
                          y: Number.parseInt(event.target.value, 10),
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Top</span>
                      <span>{avatarPosition.y}%</span>
                      <span>Bottom</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
                Clicking <span className="font-medium text-foreground">Post Avatar</span>{" "}
                uploads the cropped image and saves it to your profile immediately, so
                it stays after a refresh.
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-background px-6 py-5 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {isUploadingImage
                ? "Uploading and saving your new avatar..."
                : "You can still edit your name, bio, and tags separately with Save changes."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingImage}
                onClick={() => handleAvatarDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!avatarDraft || isUploadingImage}
                onClick={handleAvatarUpload}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post Avatar"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
