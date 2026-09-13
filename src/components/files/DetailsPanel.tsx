import React, { useState, useEffect } from 'react';
import { useFileStore } from '../../store/file-store';
import { getActiveStorageProvider } from '../../storage';
import { formatBytes, formatDate, getFileTypeCategory } from '../../utils/file-utils';
import {
  X,
  FileText,
  Folder,
  Download,
  Star,
  Trash2,
  Tag,
  Clock,
  HardDrive,
  Play,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import type { TGFile, TGFolder } from '../../storage/types';

export const DetailsPanel: React.FC = () => {
  const {
    detailsPanelOpen,
    toggleDetailsPanel,
    inspectedItem,
    downloadFile,
    toggleFavorite,
    folders,
    files,
  } = useFileStore();

  if (!detailsPanelOpen) return null;

  const isFile = inspectedItem?.type === 'file';
  const file = isFile ? (inspectedItem?.data as TGFile) : null;
  const folder = !isFile ? (inspectedItem?.data as TGFolder) : null;

  const currentParentFolder = file?.folderId
    ? folders.find((f) => f.id === file.folderId)?.name
    : 'My Storage';

  const folderItemCount = folder
    ? files.filter((f) => f.folderId === folder.id).length
    : 0;

  const category = file ? getFileTypeCategory(file.mimeType, file.name) : 'other';
  const isMedia = category === 'image' || category === 'video';
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [thumbLoading, setThumbLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!file || !isMedia) {
      setThumbUrl('');
      return;
    }

    const provider = getActiveStorageProvider();
    if (!provider.getFileThumbnailUrl) return;

    setThumbLoading(true);
    provider
      .getFileThumbnailUrl(file.id)
      .then((url) => {
        if (isMounted) setThumbUrl(url || '');
      })
      .catch(() => {
        if (isMounted) setThumbUrl('');
      })
      .finally(() => {
        if (isMounted) setThumbLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file?.id, isMedia]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={toggleDetailsPanel}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-150"
        aria-hidden="true"
      />

      {/* Details Panel Drawer (Desktop docked, Mobile slide-over) */}
      <div className="fixed lg:static inset-y-0 right-0 z-50 lg:z-20 w-80 max-w-[85vw] lg:w-72 border-l border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#1e1f20] p-4 flex flex-col justify-between transition-colors shrink-0 select-none overflow-y-auto shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7] dark:border-[#3c4043]">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
              {file ? file.name : folder ? folder.name : 'Item Details'}
            </h3>
            <button
              onClick={toggleDetailsPanel}
              className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          {!inspectedItem ? (
            <div className="py-12 text-center text-xs text-[#747775] dark:text-[#8e918f]">
              Select a file or folder to view details.
            </div>
          ) : isFile && file ? (
            <div className="py-4 space-y-4 text-xs">
              {/* Thumbnail Box */}
              <div className="relative h-36 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center border border-[#e0e3e7] dark:border-[#3c4043] overflow-hidden">
                {thumbUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black/5 dark:bg-black/20">
                    <img
                      src={thumbUrl}
                      alt={file.name}
                      className="w-full h-full object-contain"
                    />
                    {category === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white shadow-lg">
                          <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : thumbLoading ? (
                  <div className="w-full h-full flex items-center justify-center animate-pulse bg-black/5 dark:bg-white/5">
                    <span className="text-xs text-[#747775] dark:text-[#8e918f]">Loading preview...</span>
                  </div>
                ) : category === 'image' ? (
                  <ImageIcon className="w-10 h-10 text-red-500" />
                ) : category === 'video' ? (
                  <Film className="w-10 h-10 text-red-600" />
                ) : (
                  <FileText className="w-10 h-10 text-[#0b57d0] dark:text-[#a8c7fa]" />
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(file.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => toggleFavorite(file.id)}
                  className={`p-2 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition cursor-pointer ${
                    file.isFavorite ? 'text-amber-500' : 'text-[#747775]'
                  }`}
                  title="Star item"
                >
                  <Star className="w-4 h-4" fill={file.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Metadata Fields */}
              <div className="space-y-3 pt-2 text-[#444746] dark:text-[#c4c7c5]">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Type
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {file.mimeType}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Size
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {formatBytes(file.size)}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Storage Location
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-[#0b57d0] dark:text-[#a8c7fa]" />
                    {currentParentFolder}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Date Modified
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#747775]" />
                    {formatDate(file.date)}
                  </p>
                </div>

                {file.tags && file.tags.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                      Tags
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] text-[10px] font-medium text-[#0b57d0] dark:text-[#a8c7fa]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : folder ? (
            <div className="py-4 space-y-4 text-xs">
              <div className="h-32 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center border border-[#e0e3e7] dark:border-[#3c4043]">
                <Folder className="w-12 h-12 text-[#444746] dark:text-[#c4c7c5]" />
              </div>

              <div className="space-y-3 pt-2 text-[#444746] dark:text-[#c4c7c5]">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Folder Contents
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {folderItemCount} {folderItemCount === 1 ? 'file' : 'files'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#747775] tracking-wider block mb-1">
                    Created
                  </span>
                  <p className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {formatDate(folder.createdAt / 1000)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
