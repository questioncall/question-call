import { FileTextIcon, FileIcon, ImageIcon, PresentationIcon } from "lucide-react";

export type FileType = "PDF" | "DOCX" | "PPT" | "Image";
export type Visibility = "public" | "private";

export type NoteDetail = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileType: FileType;
  fileUrl: string | null;
  visibility: Visibility;
  price: number;
  uploaderId: string | null;
  uploaderName: string;
  uploaderUsername: string | null;
  uploaderImage: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export const FILE_TYPE_CONFIG: Record<
  FileType,
  { color: string; bgColor: string; icon: typeof FileTextIcon; label: string }
> = {
  PDF: { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10", icon: FileTextIcon, label: "PDF Document" },
  DOCX: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10", icon: FileIcon, label: "Word Document" },
  PPT: { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", icon: PresentationIcon, label: "Presentation" },
  Image: { color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10", icon: ImageIcon, label: "Image" },
};

export const SUBJECTS = [
  "Physics", "Biology", "Chemistry", "Mathematics", "English",
  "Computer Science", "Social Studies", "Accountancy", "Other",
];

export const GRADES = [
  "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "Bachelor's", "Other",
];

export const FILE_TYPES: FileType[] = ["PDF", "DOCX", "PPT", "Image"];

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "just now";
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
