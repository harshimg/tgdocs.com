import React, { useState, useEffect } from 'react';
import { useFileStore } from '../../store/file-store';
import { formatBytes } from '../../utils/file-utils';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';

export const UploadDropzone: React.FC = () => {
  const { uploadQueue, uploadFiles, currentFolderId, folders } = useFileStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (uploadQueue.length > 0) {
      setIsOpen(true);
    }
  }, [uploadQueue.length]);

  // Window drag & drop listeners
  useEffect(() => {
    let dragCounter = 0;

    const isFilesDrag = (e: DragEvent) => {
      if (!e.dataTransfer) return false;
      const types = Array.from(e.dataTransfer.types || []);
      return types.includes('Files');
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (isFilesDrag(e)) {
        dragCounter++;
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (isFilesDrag(e) && e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [uploadFiles]);

  const targetFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || 'Folder'
    : 'My Storage';

  const activeCount = uploadQueue.filter((t) => t.status === 'uploading').length;
  const completedCount = uploadQueue.filter((t) => t.status === 'completed').length;

  return (
    <>
      {/* Full-screen Google Drive Drag Overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 bg-[#0b57d0]/20 dark:bg-[#004a77]/30 backdrop-blur-xs border-4 border-dashed border-[#0b57d0] dark:border-[#a8c7fa] flex flex-col items-center justify-center animate-in fade-in duration-100 select-none pointer-events-none"
        >
          <div className="p-8 sm:p-10 bg-white dark:bg-[#1e1f20] rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-[#e0e3e7] dark:border-[#3c4043] scale-105 transition-transform">
            <div className="w-16 h-16 rounded-2xl bg-[#d3e3fd] dark:bg-[#004a77] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa]">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Drop files to upload
            </h3>
            <p className="text-xs text-[#747775] dark:text-[#8e918f]">
              Files will be uploaded directly to <span className="font-semibold text-[#0b57d0] dark:text-[#a8c7fa]">{targetFolderName}</span> in Telegram Cloud
            </p>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Widget (Google Drive Style) */}
      {isOpen && uploadQueue.length > 0 && (
        <div className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-4 z-40 w-auto sm:w-96 max-w-sm bg-white dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-[#e0e3e7] dark:border-[#3c4043] overflow-hidden select-none animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-between border-b border-[#e0e3e7] dark:border-[#3c4043]">
            <div className="flex items-center gap-2">
              {activeCount > 0 ? (
                <Loader2 className="w-4 h-4 text-[#0b57d0] dark:text-[#a8c7fa] animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#34a853]" />
              )}
              <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                {activeCount > 0
                  ? `Uploading ${activeCount} item${activeCount > 1 ? 's' : ''}...`
                  : `${completedCount} upload${completedCount > 1 ? 's' : ''} complete`}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#747775] dark:text-[#8e918f]">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-[#e0e3e7] dark:hover:bg-[#3c4043] rounded-lg transition"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#e0e3e7] dark:hover:bg-[#3c4043] rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <div className="max-h-64 overflow-y-auto divide-y divide-[#f0f4f9] dark:divide-[#282a2c] p-2">
              {uploadQueue.map((task) => (
                <div key={task.id} className="p-2 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#1f1f1f] dark:text-[#e3e3e3]">
                    <span className="font-medium truncate max-w-[200px]">{task.file.name}</span>
                    <span className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                      {formatBytes(task.file.size)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#f0f4f9] dark:bg-[#282a2c] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        task.status === 'error'
                          ? 'bg-red-500'
                          : task.status === 'completed'
                          ? 'bg-[#34a853]'
                          : 'bg-[#0b57d0] dark:bg-[#a8c7fa]'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#747775] dark:text-[#8e918f]">
                      {task.status === 'uploading'
                        ? `${task.progress}%`
                        : task.status === 'completed'
                        ? 'Finished'
                        : 'Upload failed'}
                    </span>
                    {task.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34a853]" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
