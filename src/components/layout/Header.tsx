import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useFileStore } from '../../store/file-store';
import {
  Search,
  Moon,
  Sun,
  Shield,
  LogOut,
  X,
  HardDrive,
  Info,
  CheckCircle2,
  Sparkles,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onOpenPrivacyModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPrivacyModal, onOpenSettingsModal }) => {
  const { user, isDemoMode, logout } = useAuthStore();
  const { searchQuery, setSearchQuery, isDarkMode, toggleTheme, mobileSidebarOpen, setMobileSidebarOpen } =
    useFileStore();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User'
    : 'Guest';

  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 px-2.5 sm:px-4 md:px-6 flex items-center justify-between border-b border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#1e1f20] transition-colors shrink-0 z-30">
      {/* Left: Mobile Hamburger + Brand & Logo */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 lg:w-60">
        {/* Mobile Hamburger Menu Toggle (Google Drive style) */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="lg:hidden p-2 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition"
          title="Open navigation"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0b57d0] dark:bg-[#a8c7fa] flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-[#041e49]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div className="hidden min-[380px]:flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">TGDocs</span>
            {isDemoMode ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                Demo
              </span>
            ) : (
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" />
                MTProto
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Google Drive Search Bar */}
      <div className="flex-1 max-w-2xl px-1.5 sm:px-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-[#747775] dark:text-[#8e918f]">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-[#0b57d0] dark:group-focus-within:text-[#a8c7fa] transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search in TGDocs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-2.5 rounded-full bg-[#f0f4f9] hover:bg-[#e9eef6] focus:bg-white dark:bg-[#282a2c] dark:hover:bg-[#333538] dark:focus:bg-[#1e1f20] border border-transparent focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] text-xs sm:text-sm text-[#1f1f1f] dark:text-[#e3e3e3] placeholder-[#747775] dark:placeholder-[#8e918f] focus:outline-none focus:shadow-md transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Privacy / Architecture Info */}
        <button
          onClick={onOpenPrivacyModal}
          title="Privacy & Architecture"
          className="p-2 sm:p-2.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition"
        >
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#0b57d0] dark:text-[#a8c7fa]" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 sm:p-2.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition"
        >
          {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* User Avatar & Dropdown */}
        <div className="relative ml-1 sm:ml-2" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#041e49] font-medium text-xs sm:text-sm flex items-center justify-center hover:opacity-90 shadow-sm ring-2 ring-transparent hover:ring-[#d3e3fd] transition"
          >
            {userInitial}
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-72 bg-white dark:bg-[#1e1f20] rounded-2xl shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3 pb-3 border-b border-[#e0e3e7] dark:border-[#3c4043]">
                <div className="w-10 h-10 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#041e49] font-semibold flex items-center justify-center text-base shrink-0">
                  {userInitial}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3] truncate">{displayName}</p>
                  {user?.phone && (
                    <p className="text-xs text-[#747775] dark:text-[#8e918f] truncate">{user.phone}</p>
                  )}
                  {isDemoMode && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3" /> Demo Sandbox
                    </span>
                  )}
                </div>
              </div>

              {/* Status info */}
              <div className="py-3 text-xs space-y-2 text-[#444746] dark:text-[#c4c7c5] border-b border-[#e0e3e7] dark:border-[#3c4043]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#0b57d0] dark:text-[#a8c7fa]" />
                    Storage Target:
                  </span>
                  <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {isDemoMode ? 'Local Memory' : 'Private Channel'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#34a853]" />
                    Security:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">AES-GCM Encrypted</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition flex items-center gap-2"
                >
                  <Info className="w-4 h-4 text-[#747775]" />
                  Storage & Sync Settings
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {isDemoMode ? 'Exit Demo' : 'Sign Out & Purge Keys'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
