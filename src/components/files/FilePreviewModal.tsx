import React, { useState, useEffect } from 'react';
import type { TGFile } from '../../storage/types';
import { useFileStore } from '../../store/file-store';
import { getActiveStorageProvider } from '../../storage';
import { formatBytes, getFileTypeCategory } from '../../utils/file-utils';
import { X, Download, Star, ExternalLink, Loader2, File, Music } from 'lucide-react';

interface FilePreviewModalProps {
  file: TGFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { downloadFile, toggleFavorite } = useFileStore();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    const provider = getActiveStorageProvider();
    setLoading(true);

    provider
      .getFilePreviewUrl(file.id)
      .then((url) => {
        setPreviewUrl(url);
      })
      .catch((e) => {
        console.warn('Could not load preview URL:', e);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file?.id]);

  if (!file) return null;

  const category = getFileTypeCategory(file.mimeType, file.name);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-between animate-in fade-in duration-150">
      {/* Top Action Bar */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between text-white bg-black/50 select-none">
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 pr-2">
          <File className="w-5 h-5 text-gray-300 shrink-0" />
          <div className="truncate min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold truncate">{file.name}</h2>
            <p className="text-[10px] sm:text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => toggleFavorite(file.id)}
            className={`p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition cursor-pointer ${
              file.isFavorite ? 'text-amber-400' : 'text-gray-300'
            }`}
            title="Star file"
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5" fill={file.isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => downloadFile(file.id)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
            title="Download"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
            title="Close preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Main Preview Center Area */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-8 h-8 animate-spin text-[#a8c7fa]" />
            <p className="text-xs text-gray-300">Retrieving media from Telegram...</p>
          </div>
        ) : category === 'image' && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-h-[80dvh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        ) : category === 'video' && previewUrl ? (
          <video
            src={previewUrl}
            controls
            autoPlay
            className="max-h-[80dvh] max-w-full rounded-lg shadow-2xl"
          />
        ) : category === 'audio' && previewUrl ? (
          <div className="p-6 sm:p-8 bg-[#1e1f20] rounded-3xl border border-gray-700 shadow-2xl flex flex-col items-center gap-4 w-[calc(100vw-2rem)] max-w-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0b57d0] flex items-center justify-center shrink-0">
              <Music className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-full text-center">{file.name}</p>
            <audio src={previewUrl} controls className="w-full" />
          </div>
        ) : (
          <div className="p-6 sm:p-8 bg-[#1e1f20] rounded-3xl border border-gray-700 text-center w-[calc(100vw-2rem)] max-w-md shadow-2xl">
            <File className="w-12 h-12 sm:w-16 sm:h-16 text-[#a8c7fa] mx-auto mb-4" />
            <h3 className="text-sm sm:text-base font-semibold text-white mb-1 truncate">{file.name}</h3>
            <p className="text-xs text-gray-400 mb-6">
              No direct browser preview available for {file.mimeType || 'this file format'}.
            </p>
            <button
              onClick={() => downloadFile(file.id)}
              className="py-2.5 px-6 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white font-medium text-xs transition flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
