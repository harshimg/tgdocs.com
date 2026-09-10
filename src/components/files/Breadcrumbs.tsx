import React from 'react';
import { useFileStore } from '../../store/file-store';
import { ChevronRight, Home, Folder } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const { currentFolderId, folders, activeFilter, setCurrentFolder, setActiveFilter } = useFileStore();

  // Find chain of folders
  const folderChain: { id: string; name: string }[] = [];
  let tempId = currentFolderId;

  while (tempId) {
    const found = folders.find((f) => f.id === tempId);
    if (found) {
      folderChain.unshift({ id: found.id, name: found.name });
      tempId = found.parentId;
    } else {
      break;
    }
  }

  const getRootTitle = () => {
    switch (activeFilter) {
      case 'favorites':
        return 'Starred';
      case 'recent':
        return 'Recent';
      case 'trash':
        return 'Trash';
      default:
        return 'My Storage';
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-[#444746] dark:text-[#c4c7c5] select-none py-0.5 sm:py-1 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
      <button
        onClick={() => {
          if (activeFilter !== 'all') {
            setActiveFilter(activeFilter);
          } else {
            setCurrentFolder(null);
          }
        }}
        className="flex items-center gap-1.5 font-medium hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] px-2 py-1 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] transition shrink-0 cursor-pointer"
      >
        <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#747775] dark:text-[#8e918f] shrink-0" />
        <span>{getRootTitle()}</span>
      </button>

      {folderChain.map((folder, index) => {
        const isLast = index === folderChain.length - 1;
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#747775] dark:text-[#8e918f] shrink-0" />
            <button
              onClick={() => setCurrentFolder(folder.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                isLast
                  ? 'font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]'
                  : 'hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
              }`}
            >
              <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#747775] dark:text-[#8e918f] shrink-0" />
              <span>{folder.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
