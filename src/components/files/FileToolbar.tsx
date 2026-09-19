import React from 'react';
import { useFileStore } from '../../store/file-store';
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  Download,
  Trash2,
  RotateCcw,
  X,
  Info,
  Star,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '../../i18n/context';

export const FileToolbar: React.FC = () => {
  const { t } = useTranslation();
  const {
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    setSort,
    selectedFileIds,
    activeFilter,
    selectAllFiles,
    clearSelection,
    downloadFile,
    trashSelectedFiles,
    restoreSelectedFiles,
    deleteSelectedPermanently,
    detailsPanelOpen,
    toggleDetailsPanel,
    loadAll,
    isLoading,
  } = useFileStore();

  const isSelectionActive = selectedFileIds.length > 0;

  const handleBulkDownload = async () => {
    for (const id of selectedFileIds) {
      await downloadFile(id);
    }
  };

  return (
    <div className="h-12 px-2.5 sm:px-4 flex items-center justify-between border-b border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#1e1f20] transition-colors select-none gap-2 overflow-x-auto scrollbar-none">
      {/* Left: Multi-select Action Bar or Sort Indicator */}
      {isSelectionActive ? (
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={clearSelection}
            className="p-1 rounded-full hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] cursor-pointer"
            title={t('files.clearSelection')}
          >
            <X className="w-4 h-4" />
          </button>

          <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff] shrink-0">
            {selectedFileIds.length} <span className="hidden min-[400px]:inline">{t('files.itemsSelected')}</span>
          </span>

          <div className="h-4 w-[1px] bg-[#e0e3e7] dark:bg-[#3c4043] mx-0.5 sm:mx-1" />

          {/* Download Selected */}
          {activeFilter !== 'trash' && (
            <button
              onClick={handleBulkDownload}
              title={t('files.download')}
              className="p-1.5 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 text-xs font-medium transition cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{t('files.download')}</span>
            </button>
          )}

          {/* Trash or Restore */}
          {activeFilter === 'trash' ? (
            <>
              <button
                onClick={restoreSelectedFiles}
                title={t('files.restore')}
                className="p-1.5 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 text-xs font-medium transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-[#34a853]" />
                <span className="hidden md:inline">{t('files.restore')}</span>
              </button>

              <button
                onClick={deleteSelectedPermanently}
                title={t('files.deleteForever')}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-1.5 text-xs font-medium transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">{t('files.deleteForever')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={trashSelectedFiles}
              title={t('files.trashAction')}
              className="p-1.5 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 text-xs font-medium transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">{t('files.trashAction')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          {/* Select all */}
          <button
            onClick={selectAllFiles}
            title={t('files.selectAll')}
            className="p-1.5 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 text-xs transition cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden min-[480px]:inline">{t('files.selectAll')}</span>
          </button>
        </div>
      )}

      {/* Right Controls: Sort & View Toggle */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {/* Sort selector */}
        <div className="flex items-center gap-1 text-xs text-[#444746] dark:text-[#c4c7c5] mr-1 sm:mr-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#747775] dark:text-[#8e918f] shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-transparent text-xs font-medium text-[#444746] dark:text-[#c4c7c5] focus:outline-none cursor-pointer"
          >
            <option value="name">{t('files.sortName')} {sortOrder === 'asc' ? '↑' : '↓'}</option>
            <option value="date">{t('files.sortDate')} {sortOrder === 'asc' ? '↑' : '↓'}</option>
            <option value="size">{t('files.sortSize')} {sortOrder === 'asc' ? '↑' : '↓'}</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid */}
        <button
          onClick={() => setViewMode('grid')}
          title={t('files.gridView')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]'
              : 'hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* View Mode Toggle: List */}
        <button
          onClick={() => setViewMode('list')}
          title={t('files.listView')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            viewMode === 'list'
              ? 'bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]'
              : 'hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]'
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-[#e0e3e7] dark:bg-[#3c4043] mx-0.5 sm:mx-1" />

        {/* Details Panel Toggle */}
        <button
          onClick={toggleDetailsPanel}
          title={t('files.fileDetails')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            detailsPanelOpen
              ? 'bg-[#c2e7ff] text-[#001d35] dark:bg-[#004a77] dark:text-[#c2e7ff]'
              : 'hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Refresh / Sync Button */}
        <button
          onClick={() => loadAll()}
          disabled={isLoading}
          title={t('header.activeSession')}
          className="p-1.5 rounded-lg hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0b57d0] dark:text-[#a8c7fa]' : ''}`} />
        </button>
      </div>
    </div>
  );
};
