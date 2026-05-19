import React, { useState } from "react";
import { cn } from "../../lib/cn";
import {
  FileText,
  FileImage,
  File,
  Download,
  Eye,
} from "lucide-react";

export interface FilePreviewProps {
  name: string;
  size?: string;
  type?: string;
  url?: string;
  thumbnailUrl?: string;
  className?: string;
  onPreview?: () => void;
  onDownload?: () => void;
  compact?: boolean;
}

function getFileType(filename: string, mimeType?: string): "image" | "pdf" | "doc" | "unknown" {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime = mimeType?.toLowerCase();

  if (mime?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext || "")) {
    return "image";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext || "") ||
    mime?.startsWith("text/") ||
    mime?.includes("spreadsheet") ||
    mime?.includes("document") ||
    mime?.includes("presentation")
  ) {
    return "doc";
  }
  return "unknown";
}

const fileTypeIcons: Record<string, React.ReactNode> = {
  image: <FileImage className="h-5 w-5 text-blue-500" />,
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  doc: <FileText className="h-5 w-5 text-blue-500" />,
  unknown: <File className="h-5 w-5 text-navy-400" />,
};

const fileTypeBg: Record<string, string> = {
  image: "bg-blue-50 dark:bg-blue-900/20",
  pdf: "bg-red-50 dark:bg-red-900/20",
  doc: "bg-blue-50 dark:bg-blue-900/20",
  unknown: "bg-navy-100 dark:bg-navy-700/40",
};

export function FilePreview({
  name,
  size,
  type,
  url,
  thumbnailUrl,
  className,
  onPreview,
  onDownload,
  compact = false,
}: FilePreviewProps) {
  const [imgError, setImgError] = useState(false);
  const fileType = getFileType(name, type);
  const isImage = fileType === "image";

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-navy-100 dark:border-navy-700 bg-white px-2.5 py-2 dark:border-navy-600 dark:bg-navy-700",
          className
        )}
      >
        <span className="shrink-0">{fileTypeIcons[fileType]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-navy-600 dark:text-navy-200">
            {name}
          </p>
          {size && (
            <p className="text-2xs text-navy-400 dark:text-navy-400">{size}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-navy-100 dark:border-navy-700 bg-white p-3 dark:border-navy-600 dark:bg-navy-700",
        className
      )}
    >
      {/* Thumbnail */}
      {isImage && thumbnailUrl && !imgError ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-navy-100 dark:bg-navy-600">
          <img
            src={thumbnailUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            fileTypeBg[fileType]
          )}
        >
          {fileTypeIcons[fileType]}
        </div>
      )}

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-600 dark:text-navy-200">
          {name}
        </p>
        {size && (
          <p className="text-xs text-navy-400 dark:text-navy-400">{size}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-500 dark:hover:bg-navy-600 dark:hover:text-navy-300"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-500 dark:hover:bg-navy-600 dark:hover:text-navy-300"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
