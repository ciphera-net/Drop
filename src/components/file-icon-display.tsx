import { 
  File, 
  FileImage, 
  FileCode, 
  FileArchive, 
  FilePdf, 
  FileVideo, 
  FileAudio, 
  FileText 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'text' | 'other';

interface FileIconDisplayProps {
  category?: string | null;
  className?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

export function FileIconDisplay({ category, className, weight = "duotone" }: FileIconDisplayProps) {
  switch (category) {
    case 'image':
      return <FileImage className={className} weight={weight} />;
    case 'video':
      return <FileVideo className={className} weight={weight} />;
    case 'audio':
      return <FileAudio className={className} weight={weight} />;
    case 'pdf':
      return <FilePdf className={className} weight={weight} />;
    case 'archive':
      return <FileArchive className={className} weight={weight} />;
    case 'code':
      return <FileCode className={className} weight={weight} />;
    case 'text':
      return <FileText className={className} weight={weight} />;
    default:
      return <File className={className} weight={weight} />;
  }
}

