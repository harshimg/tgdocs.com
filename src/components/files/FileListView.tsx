import React from 'react';
import type { TGFile, TGFolder } from '../../storage/types';
import { useFileStore } from '../../store/file-store';
import { formatBytes, formatDate, getFileTypeCategory } from '../../utils/file-utils';
import {
  Folder,
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
} from 'lucide-react';
import { useTranslation } from '../../i18n/context';

interface FileListViewProps {
  folders: TGFolder[];
  files: TGFile[];
  onRenameFolder: (f: TGFolder) => void;
  onRenameFile: (f: TGFile) => void;
  onPreviewFile: (f: TGFile) => void;
}

export const FileListView: React.FC<FileListViewProps> = ({
  folders,
  files,
  onRenameFolder,
  onRenameFile,
  onPreviewFile,
}) => {
  const { t } = useTranslation();
  const {
    selectedFileIds,
    toggleSelectFile,
    setCurrentFolder,
    downloadFile,
    toggleFavorite,
    setInspectedItem,
  } = useFileStore();

  const getFileIcon = (mimeType: string, name: string) => {
    const cat = getFileTypeCategory(mimeType, name);
    switch (cat) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-red-500" />;
      case 'video':
        return <Film className="w-4 h-4 text-red-600" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-blue-500" />;
      case 'archive':
        return <FileArchive className="w-4 h-4 text-purple-500" />;
      default:
        return <File className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="w-full select-none">
      {/* Mobile List View (< sm screens) - Google Drive Mobile App Style */}
      <div className="sm:hidden divide-y divide-[#f0f4f9] dark:divide-[#282a2c]">
        {/* Folders */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => setCurrentFolder(folder.id)}
            className="flex items-center justify-between py-3 px-1 hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] active:bg-[#e9eef6] dark:active:bg-[#333538] transition cursor-pointer"
          >
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-[#444746] dark:text-[#c4c7c5]" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                  {folder.name}
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                  Folder · {formatDate(folder.createdAt / 1000)}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameFolder(folder);
              }}
              className="p-2 text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] rounded-full shrink-0"
              title="Folder options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Files */}
        {files.map((file) => {
          const isSelected = selectedFileIds.includes(file.id);
          return (
            <div
              key={file.id}
              onClick={(e) => {
                // On mobile, single tap selects or previews
                toggleSelectFile(file.id, false);
              }}
              onDoubleClick={() => onPreviewFile(file)}
              className={`flex items-center justify-between py-3 px-1 transition cursor-pointer ${
                isSelected
                  ? 'bg-[#c2e7ff]/40 dark:bg-[#004a77]/30'
                  : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] active:bg-[#e9eef6] dark:active:bg-[#333538]'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center shrink-0">
                  {getFileIcon(file.mimeType, file.name)}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                    {formatBytes(file.size)} · {formatDate(file.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(file.id);
                  }}
                  className={`p-2 transition rounded-full ${
                    file.isFavorite ? 'text-amber-500' : 'text-[#747775]'
                  }`}
                  title="Star file"
                >
                  <Star className="w-3.5 h-3.5" fill={file.isFavorite ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewFile(file);
                  }}
                  className="p-2 text-[#0b57d0] dark:text-[#a8c7fa] rounded-full"
                  title="Preview file"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameFile(file);
                  }}
                  className="p-2 text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] rounded-full"
                  title="File options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet & Desktop Table View (>= sm screens) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#e0e3e7] dark:border-[#3c4043] text-[#444746] dark:text-[#c4c7c5] font-medium">
              <th className="py-2.5 px-4 font-normal">{t('files.name')}</th>
              <th className="py-2.5 px-4 font-normal hidden sm:table-cell">{t('files.owner')}</th>
              <th className="py-2.5 px-4 font-normal hidden md:table-cell">{t('files.lastModified')}</th>
              <th className="py-2.5 px-4 font-normal hidden sm:table-cell">{t('files.fileSize')}</th>
              <th className="py-2.5 px-4 font-normal text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f4f9] dark:divide-[#282a2c]">
            {/* Folders */}
            {folders.map((folder) => (
              <tr
                key={folder.id}
                onClick={() => setInspectedItem({ type: 'folder', data: folder })}
                onDoubleClick={() => setCurrentFolder(folder.id)}
                className="hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] cursor-pointer transition text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                <td className="py-3 px-4 flex items-center gap-3">
                  <Folder className="w-4 h-4 text-[#747775] dark:text-[#8e918f]" />
                  <span className="font-medium truncate max-w-xs">{folder.name}</span>
                </td>
                <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden sm:table-cell">{t('files.me')}</td>
                <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden md:table-cell">
                  {formatDate(folder.createdAt / 1000)}
                </td>
                <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden sm:table-cell">—</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameFolder(folder);
                    }}
                    className="p-1 text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Files */}
            {files.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);
              return (
                <tr
                  key={file.id}
                  onClick={(e) => toggleSelectFile(file.id, e.metaKey || e.ctrlKey)}
                  onDoubleClick={() => onPreviewFile(file)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#c2e7ff]/40 dark:bg-[#004a77]/30 text-[#001d35] dark:text-[#c2e7ff]'
                      : 'hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                  }`}
                >
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="shrink-0">{getFileIcon(file.mimeType, file.name)}</div>
                    <span className="font-medium truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden sm:table-cell">{t('files.me')}</td>
                  <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden md:table-cell">
                    {formatDate(file.date)}
                  </td>
                  <td className="py-3 px-4 text-[#747775] dark:text-[#8e918f] hidden sm:table-cell">
                    {formatBytes(file.size)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(file.id);
                        }}
                        className={`p-1 transition cursor-pointer ${
                          file.isFavorite ? 'text-amber-500' : 'text-[#747775] hover:text-[#1f1f1f]'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" fill={file.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file.id);
                        }}
                        className="p-1 text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameFile(file);
                        }}
                        className="p-1 text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
