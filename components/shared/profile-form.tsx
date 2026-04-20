"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { uploadFileViaServer } from "@/lib/client-upload";
import { UserRecord } from "@/models/User";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  bio: z.string().max(500).optional(),
  userImage: z.string().url().optional().or(z.literal("")),
  skills: z.string().optional(),
  interests: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

import { useDispatch } from "react-redux";
import { updateProfile } from "@/store/features/user/user-slice";

export function ProfileForm({ user }: { user: Partial<UserRecord> }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadProgress(0);

    try {
      const data = await uploadFileViaServer<{ secure_url: string }>(file, {
        onProgress: ({ percent }) => {
          setImageUploadProgress(percent);
        },
      });
      
      const newImage = data.secure_url;
      setValue("userImage", newImage, { shouldDirty: true, shouldValidate: true });
      dispatch(updateProfile({ userImage: newImage }));
      toast.success("Image uploaded successfully!");
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploadingImage(false);
      setImageUploadProgress(null);
      // Reset input so the same file could be picked again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const skillsArray = data.skills
        ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const interestsArray = data.interests
        ? data.interests.split(",").map((s) => s.trim()).filter(Boolean) : [];

      const payload = {
        name: data.name,
        bio: data.bio,
        userImage: data.userImage,
        skills: skillsArray,
        interests: interestsArray,
      };

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      dispatch(updateProfile({ name: data.name, userImage: data.userImage }));
      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating your profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar Upload (Custom UI) */}
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
            onChange={handleImageUpload}
          />
          <Button 
            type="button" 
            variant="outline" 
            disabled={isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingImage ? "Uploading..." : "Change Avatar"}
          </Button>
          {isUploadingImage && imageUploadProgress !== null ? (
            <UploadProgressBar
              className="mt-3 w-full max-w-[240px]"
              label="Uploading avatar"
              value={imageUploadProgress}
            />
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Must be a valid image file. Max 5MB.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name / Display Name</Label>
        <Input id="name" placeholder="Enter your full name" {...register("name")} />
        {errors.name && <p className="text-[0.8rem] font-medium text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us a little bit about yourself (max 500 characters)"
          className="resize-none"
          {...register("bio")}
        />
        <p className="text-[0.8rem] text-muted-foreground">Brief description for your profile. URLs are hyperlinked.</p>
        {errors.bio && <p className="text-[0.8rem] font-medium text-destructive">{errors.bio.message}</p>}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="skills">Skills</Label>
          <Input id="skills" placeholder="Physics, Calculus, Algorithms..." {...register("skills")} />
          <p className="text-[0.8rem] text-muted-foreground">Comma-separated list of tags.</p>
          {errors.skills && <p className="text-[0.8rem] font-medium text-destructive">{errors.skills.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interests">Interests</Label>
          <Input id="interests" placeholder="AI, Board Games, Literature..." {...register("interests")} />
          <p className="text-[0.8rem] text-muted-foreground">Comma-separated list of tags.</p>
          {errors.interests && <p className="text-[0.8rem] font-medium text-destructive">{errors.interests.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
