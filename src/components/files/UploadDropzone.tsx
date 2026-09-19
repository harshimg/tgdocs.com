import React, { useState, useEffect } from 'react';
import { useFileStore } from '../../store/file-store';
import { formatBytes } from '../../utils/file-utils';
import { useTranslation } from '../../i18n/context';
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
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (uploadQueue.length > 0) {
      setIsOpen(true);
    }
  }, [uploadQueue.length]);

  // Window drag & drop listeners to open the full-screen dropzone overlay
  useEffect(() => {
    let dragCounter = 0;

    const isFilesDrag = (e: DragEvent) => {
      if (!e.dataTransfer) return false;
      const types = Array.from(e.dataTransfer.types || []);
      return types.includes('Files');
    };

    const handleWindowDragEnter = (e: DragEvent) => {
      if (isFilesDrag(e)) {
        e.preventDefault();
        dragCounter++;
        setIsDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        // If cursor moved outside the browser window entirely
        if (e.clientX === 0 && e.clientY === 0) {
          setIsDragging(false);
        }
      }
    };

    // Prevent default on window so browser never navigates to dropped file
    const preventWindowDefault = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', preventWindowDefault);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', preventWindowDefault);
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const targetFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || 'Folder'
    : 'My Storage';

  const activeCount = uploadQueue.filter((t) => t.status === 'uploading').length;
  const completedCount = uploadQueue.filter((t) => t.status === 'completed').length;
  const errorCount = uploadQueue.filter((t) => t.status === 'error').length;

  return (
    <>
      {/* Full-screen Google Drive Drag Overlay (Captures drops anywhere across viewport) */}
      {isDragging && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // If leaving the overlay backdrop
            if (e.currentTarget === e.target) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              uploadFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => setIsDragging(false)}
          className="fixed inset-0 z-50 bg-[#0b57d0]/25 dark:bg-[#004a77]/35 backdrop-blur-xs border-4 border-dashed border-[#0b57d0] dark:border-[#a8c7fa] flex flex-col items-center justify-center animate-in fade-in duration-100 select-none cursor-copy pointer-events-auto"
          role="region"
          aria-label="File upload dropzone"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative p-8 sm:p-10 bg-white dark:bg-[#1e1f20] rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-[#e0e3e7] dark:border-[#3c4043] scale-105 transition-transform max-w-md mx-4 text-center cursor-default"
          >
            {/* Dismiss button */}
            <button
              onClick={() => setIsDragging(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e0e3e7] dark:hover:bg-[#3c4043] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition cursor-pointer"
              title="Cancel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[#d3e3fd] dark:bg-[#004a77] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shadow-sm">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
              {t('files.dropFiles')}
            </h3>

            <p className="text-xs text-[#747775] dark:text-[#8e918f]">
              Files will be uploaded directly to{' '}
              <span className="font-semibold text-[#0b57d0] dark:text-[#a8c7fa]">{targetFolderName}</span>{' '}
              in Telegram Cloud
            </p>

            <p className="text-[11px] text-[#747775]/80 dark:text-[#8e918f]/80 mt-1">
              Supports any file format: SVG, Images, Videos, Documents, Audio, and Archives
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
              ) : errorCount > 0 ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#34a853]" />
              )}
              <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                {activeCount > 0
                  ? `${t('files.uploading')} ${activeCount}...`
                  : errorCount > 0
                  ? `${completedCount} ${t('files.uploadSuccess')}, ${errorCount} ${t('files.uploadFailed')}`
                  : `${completedCount} ${t('files.uploadSuccess')}`}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#747775] dark:text-[#8e918f]">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-[#e0e3e7] dark:hover:bg-[#3c4043] rounded-lg transition cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#e0e3e7] dark:hover:bg-[#3c4043] rounded-lg transition cursor-pointer"
                title="Close"
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
                    <span className="font-medium truncate max-w-[200px]" title={task.file.name}>
                      {task.file.name}
                    </span>
                    <span className="text-[11px] text-[#747775] dark:text-[#8e918f] shrink-0 ml-2">
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
                    <span
                      className={`truncate max-w-[240px] ${
                        task.status === 'error' ? 'text-red-500 font-medium' : 'text-[#747775] dark:text-[#8e918f]'
                      }`}
                      title={task.error || ''}
                    >
                      {task.status === 'uploading'
                        ? `${task.progress}%`
                        : task.status === 'completed'
                        ? t('files.uploadSuccess')
                        : task.error || t('files.uploadFailed')}
                    </span>
                    {task.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34a853] shrink-0 ml-1" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 ml-1" />
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
