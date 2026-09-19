import React, { useState, useRef, useEffect } from 'react';
import type { TGFile } from '../../storage/types';
import { getActiveStorageProvider } from '../../storage';
import { useFileStore } from '../../store/file-store';
import { formatBytes, formatDate, getFileTypeCategory } from '../../utils/file-utils';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  FileArchive,
  File,
  Star,
  Download,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Play,
} from 'lucide-react';
import { useTranslation } from '../../i18n/context';

interface FileCardProps {
  file: TGFile;
  onRename: (file: TGFile) => void;
  onPreview: (file: TGFile) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onRename, onPreview }) => {
  const { t } = useTranslation();
  const {
    selectedFileIds,
    toggleSelectFile,
    downloadFile,
    toggleFavorite,
    trashFile,
    restoreFile,
    deleteFilePermanently,
    setInspectedItem,
  } = useFileStore();

  const isSelected = selectedFileIds.includes(file.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const category = getFileTypeCategory(file.mimeType, file.name);
  const isMedia = category === 'image' || category === 'video';

  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isMedia) return;

    const provider = getActiveStorageProvider();
    if (!provider.getFileThumbnailUrl) return;

    setThumbLoading(true);
    setThumbError(false);

    provider
      .getFileThumbnailUrl(file.id)
      .then((url) => {
        if (isMounted) {
          if (url) {
            setThumbnailUrl(url);
          } else {
            setThumbError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) setThumbError(true);
      })
      .finally(() => {
        if (isMounted) setThumbLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file.id, isMedia]);

  const renderIcon = () => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-red-500" />;
      case 'video':
        return <Film className="w-5 h-5 text-red-600" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-blue-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div
      onClick={(e) => {
        toggleSelectFile(file.id, e.metaKey || e.ctrlKey);
      }}
      onDoubleClick={() => onPreview(file)}
      className={`group relative flex flex-col justify-between rounded-2xl p-2.5 sm:p-3 border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-[#c2e7ff]/40 dark:bg-[#004a77]/30 border-[#0b57d0] dark:border-[#a8c7fa] ring-1 ring-[#0b57d0] dark:ring-[#a8c7fa]'
          : 'bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border-[#e0e3e7] dark:border-[#3c4043]'
      }`}
    >
      {/* Card Header: Icon + Name + Menu */}
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden min-w-0">
          <div className="shrink-0">{renderIcon()}</div>
          <span className="text-xs sm:text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
            {file.name}
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Star Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(file.id);
            }}
            className={`p-1 sm:p-1.5 rounded-full hover:bg-[#dde3ea] dark:hover:bg-[#3c4043] transition cursor-pointer ${
              file.isFavorite
                ? 'text-amber-500 opacity-100'
                : 'text-[#747775] opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
            title="Star file"
          >
            <Star className="w-3.5 h-3.5" fill={file.isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Context menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 sm:p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#dde3ea] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#c4c7c5] transition cursor-pointer"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1e1f20] rounded-xl shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] py-1.5 z-40">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onPreview(file);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#747775]" />
                  <span>{t('files.open')}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    downloadFile(file.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#747775]" />
                  <span>{t('files.download')}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onRename(file);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#747775]" />
                  <span>{t('files.rename')}</span>
                </button>
                <div className="my-1 border-t border-[#e0e3e7] dark:border-[#3c4043]" />
                {file.isTrashed ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        restoreFile(file.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#34a853] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('files.restore')}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        deleteFilePermanently(file.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('files.deleteForever')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      trashFile(file.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('files.trashAction')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body: Thumbnail / Preview Area */}
      <div className="relative h-20 sm:h-28 my-2 sm:my-3 rounded-xl bg-white/70 dark:bg-[#131314]/50 border border-[#e0e3e7]/50 dark:border-[#3c4043]/50 flex items-center justify-center overflow-hidden group/thumb">
        {thumbnailUrl && !thumbError ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/5 dark:bg-black/20">
            <img
              src={thumbnailUrl}
              alt={file.name}
              loading="lazy"
              onError={() => setThumbError(true)}
              className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                file.name.toLowerCase().endsWith('.svg') || file.mimeType.includes('svg')
                  ? 'object-contain p-2'
                  : 'object-cover'
              }`}
            />
            {category === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
                  <Play className="w-4 h-4 ml-0.5 fill-white text-white" />
                </div>
              </div>
            )}
          </div>
        ) : thumbLoading ? (
          <div className="w-full h-full flex items-center justify-center animate-pulse bg-black/5 dark:bg-white/5">
            <div className="flex flex-col items-center gap-1 text-[#747775]/60 dark:text-[#8e918f]/60">
              {renderIcon()}
              <span className="text-[10px] uppercase tracking-wider font-medium">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="p-2 sm:p-4 flex flex-col items-center gap-1 text-[#747775] dark:text-[#8e918f]">
            {renderIcon()}
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium">
              {file.name.split('.').pop() || 'FILE'}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Metadata */}
      <div className="flex items-center justify-between text-[11px] text-[#747775] dark:text-[#8e918f]">
        <span>{formatBytes(file.size)}</span>
        <span>{formatDate(file.date)}</span>
      </div>
    </div>
  );
};
