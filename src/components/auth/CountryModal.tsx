import React, { useState, useMemo, useEffect, useRef } from 'react';
import { COUNTRIES, type Country } from '../../utils/countries';
import { Search, X, Check } from 'lucide-react';

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
}

export const CountryModal: React.FC<CountryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCountry,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Modal Box */}
      <div
        className="w-full max-w-sm max-h-[85dvh] bg-[#1e2025] rounded-2xl shadow-2xl border border-[#2e323b] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-[#2e323b]">
          <h3 className="text-base font-medium text-white">Country</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e9299] hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#2e323b]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8e9299]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search country or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-base sm:text-sm bg-[#141518] text-white placeholder-[#6b7280] rounded-xl border border-[#2e323b] focus:outline-none focus:border-[#24a1de] transition"
            />
          </div>
        </div>

        {/* Country List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#262930] py-1">
          {filteredCountries.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8e9299]">
              No countries found
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected = selectedCountry?.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition ${
                    isSelected ? 'bg-[#24a1de]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{c.flag}</span>
                    <span
                      className={`text-sm truncate ${
                        isSelected ? 'text-[#24a1de] font-medium' : 'text-white'
                      }`}
                    >
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-xs font-mono text-[#8e9299]">
                      {c.dialCode}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#24a1de] shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
