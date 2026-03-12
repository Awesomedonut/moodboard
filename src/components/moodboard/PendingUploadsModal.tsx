"use client";

interface PendingUploadsModalProps {
  captions: Record<string, string>;
  files: File[];
  isUploading: boolean;
  onCancel: () => void;
  onCaptionChange: (fileName: string, value: string) => void;
  onConfirm: () => void;
}

export function PendingUploadsModal({
  captions,
  files,
  isUploading,
  onCancel,
  onCaptionChange,
  onConfirm,
}: PendingUploadsModalProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Add Captions</h2>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {files.map((file) => (
            <div key={file.name} className="flex items-start gap-3">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium">{file.name}</p>
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={captions[file.name] || ""}
                  onChange={(event) => onCaptionChange(file.name, event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUploading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
