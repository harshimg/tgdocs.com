import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { saveCredentials, loadCredentials } from '../../telegram/session';
import { CountryModal } from './CountryModal';
import { COUNTRIES, type Country } from '../../utils/countries';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  EyeOff,
  Pencil,
  Sparkles,
  Lock,
  KeyRound,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    isLoading,
    error,
    phoneCodeHash,
    requires2FA,
    requestPhoneCode,
    verifyPhoneCode,
    submit2FA,
    enterDemoMode,
    clearError,
  } = useAuthStore();

  // Selected Country & Phone
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES[0] // Default to India (+91) as in screenshots
  );
  const [phone, setPhone] = useState('+91');
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Steps
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Custom API creds
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [credsSaved, setCredsSaved] = useState(false);

  useEffect(() => {
    loadCredentials().then((creds) => {
      if (creds) {
        setApiId(creds.apiId.toString());
        setApiHash(creds.apiHash);
      }
    });
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    // If phone starts with old dial code or is just "+", replace it
    const currentNumberWithoutCode = phone.replace(/^\+\d+[\s\-]*/, '').trim();
    if (currentNumberWithoutCode) {
      setPhone(`${country.dialCode} ${currentNumberWithoutCode}`);
    } else {
      setPhone(`${country.dialCode} `);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    // Auto-detect country code from input if possible
    const clean = val.replace(/\s+/g, '');
    const matched = COUNTRIES.find((c) => clean.startsWith(c.dialCode));
    if (matched && matched.code !== selectedCountry.code) {
      setSelectedCountry(matched);
    }
  };

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiId && apiHash) {
      await saveCredentials(parseInt(apiId, 10), apiHash);
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 3000);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const clean = phone.replace(/[^\d+]/g, '');
    if (!clean || clean === '+') return;
    await requestPhoneCode(clean);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!code.trim()) return;
    await verifyPhoneCode(code.trim());
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!password.trim()) return;
    await submit2FA(password.trim());
  };

  const handleBackToPhone = () => {
    // Reset back to phone input
    useAuthStore.setState({
      phoneCodeHash: null,
      requires2FA: false,
      error: null,
    });
    setCode('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-[#18191c] text-white select-none">
      {/* Country Selection Modal */}
      <CountryModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelect={handleCountrySelect}
        selectedCountry={selectedCountry}
      />

      <div className="w-full max-w-[370px] flex flex-col items-center">
        {/* Step 1: Logo & Branding */}
        {!phoneCodeHash && !requires2FA && (
          <>
            {/* TGSTORAGE / TGDocs Logo Header */}
            <div className="flex items-center gap-3.5 mb-10">
              <img
                src="/logo.svg"
                alt="TGDocs Logo"
                className="w-13 h-13 rounded-2xl object-contain shadow-lg shadow-[#0088cc]/20"
              />

              <div className="flex items-center tracking-[0.22em] font-medium text-2xl">
                <span className="text-[#24a1de] font-bold">TG</span>
                <span className="text-white ml-1">DOCS</span>
              </div>
            </div>

            {/* Subtitle & Prompt */}
            <div className="text-center mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8e9299] mb-2.5">
                SIGN IN
              </div>
              <p className="text-[13.5px] text-[#e0e2e5] font-normal leading-relaxed max-w-[270px] mx-auto">
                Please confirm your country and enter your Telegram phone number.
              </p>
            </div>
          </>
        )}

        {/* Step 2 Header (Verification Code) */}
        {phoneCodeHash && !requires2FA && (
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-full bg-[#24a1de]/15 border border-[#24a1de]/30 text-[#24a1de] flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1.5">
              <h2 className="text-xl font-semibold text-white tracking-tight">{phone}</h2>
              <button
                type="button"
                onClick={handleBackToPhone}
                className="p-1 text-[#8e9299] hover:text-white rounded transition"
                title="Edit phone number"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[13.5px] text-[#8e9299] max-w-[260px] mx-auto leading-relaxed">
              We've sent the code to the Telegram app on your device.
            </p>
          </div>
        )}

        {/* Step 3 Header (2FA Cloud Password) */}
        {requires2FA && (
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-full bg-[#24a1de]/15 border border-[#24a1de]/30 text-[#24a1de] flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-semibold text-white tracking-tight mb-1.5">
              Two-Step Verification
            </h2>
            <p className="text-[13.5px] text-[#8e9299] max-w-[270px] mx-auto leading-relaxed">
              Your account is protected with an additional cloud password.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs leading-snug animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* STEP 1 FORM: Country & Phone Number */}
        {!phoneCodeHash && !requires2FA && (
          <form onSubmit={handlePhoneSubmit} className="w-full space-y-4">
            {/* Country Selector Field */}
            <div className="relative group">
              <span className="absolute -top-2 left-3 px-1.5 bg-[#18191c] text-[11px] text-[#8e9299] group-focus-within:text-[#24a1de] font-medium z-10 transition-colors pointer-events-none">
                Country
              </span>
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl border border-[#333742] hover:border-[#4c5161] focus:border-[#24a1de] focus:outline-none bg-transparent transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-sm font-normal text-white truncate">
                    {selectedCountry.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#8e9299] shrink-0 ml-2" />
              </button>
            </div>

            {/* Phone Number Field */}
            <div className="relative group">
              <span className="absolute -top-2 left-3 px-1.5 bg-[#18191c] text-[11px] text-[#8e9299] group-focus-within:text-[#24a1de] font-medium z-10 transition-colors pointer-events-none">
                Phone Number
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+1 234 567 8900"
                required
                className="w-full px-3.5 py-3 rounded-xl border border-[#333742] hover:border-[#4c5161] focus:border-[#24a1de] focus:outline-none bg-transparent text-base sm:text-sm text-white placeholder-[#5a606d] transition font-normal"
              />
            </div>

            {/* Keep me signed in Checkbox */}
            <div className="pt-1 pb-1">
              <label className="inline-flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setKeepSignedIn(!keepSignedIn)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition border ${
                    keepSignedIn
                      ? 'bg-[#24a1de] border-[#24a1de]'
                      : 'border-[#4c5161] bg-transparent group-hover:border-[#6b7280]'
                  }`}
                >
                  {keepSignedIn && (
                    <svg
                      className="w-3.5 h-3.5 text-white stroke-[2.5]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-[#e0e2e5] select-none">
                  Keep me signed in
                </span>
              </label>
            </div>

            {/* NEXT Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#1c96d4] active:bg-[#1682b8] text-white font-medium text-sm tracking-wider uppercase transition shadow-md shadow-[#0088cc]/15 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'NEXT'
              )}
            </button>
          </form>
        )}

        {/* STEP 2 FORM: Code Verification */}
        {phoneCodeHash && !requires2FA && (
          <form onSubmit={handleCodeSubmit} className="w-full space-y-4">
            <div className="relative group">
              <span className="absolute -top-2 left-3 px-1.5 bg-[#18191c] text-[11px] text-[#8e9299] group-focus-within:text-[#24a1de] font-medium z-10 transition-colors pointer-events-none">
                Code
              </span>
              <input
                type="text"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                required
                className="w-full px-3.5 py-3 rounded-xl border border-[#333742] hover:border-[#4c5161] focus:border-[#24a1de] focus:outline-none bg-transparent text-center font-mono text-lg tracking-[0.25em] text-white placeholder-[#5a606d] transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#1c96d4] active:bg-[#1682b8] text-white font-medium text-sm tracking-wider uppercase transition shadow-md shadow-[#0088cc]/15 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'NEXT'
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-xs text-[#24a1de] hover:underline"
              >
                Wrong number?
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 FORM: 2FA Password */}
        {requires2FA && (
          <form onSubmit={handle2FASubmit} className="w-full space-y-4">
            <div className="relative group">
              <span className="absolute -top-2 left-3 px-1.5 bg-[#18191c] text-[11px] text-[#8e9299] group-focus-within:text-[#24a1de] font-medium z-10 transition-colors pointer-events-none">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your 2FA password"
                  required
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-[#333742] hover:border-[#4c5161] focus:border-[#24a1de] focus:outline-none bg-transparent text-base sm:text-sm text-white placeholder-[#5a606d] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e9299] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0088cc] hover:bg-[#1c96d4] active:bg-[#1682b8] text-white font-medium text-sm tracking-wider uppercase transition shadow-md shadow-[#0088cc]/15 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'NEXT'
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-xs text-[#24a1de] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Clean Divider & Secondary Actions */}
        <div className="w-full mt-7 pt-4 border-t border-[#262930] flex flex-col items-center gap-3">
          {/* Demo Mode Button */}
          <button
            type="button"
            onClick={enterDemoMode}
            className="w-full py-2.5 px-3 rounded-xl border border-[#2e323b] hover:border-[#3e434f] hover:bg-white/5 text-[#c8cbd0] hover:text-white text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#24a1de]" />
            <span>Launch Interactive Demo</span>
          </button>

          {/* Advanced Telegram API Settings Toggle */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[11px] text-[#6b7280] hover:text-[#9ca3af] transition py-1"
            >
              <span>Custom Telegram API Settings</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <form onSubmit={handleSaveCreds} className="mt-2.5 space-y-2.5 animate-in fade-in">
                <p className="text-[10.5px] text-[#6b7280] leading-normal">
                  Optionally provide custom API credentials from{' '}
                  <a
                    href="https://my.telegram.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#24a1de] hover:underline"
                  >
                    my.telegram.org
                  </a>
                  . Defaults are pre-configured.
                </p>
                <input
                  type="number"
                  placeholder="API ID (e.g. 1234567)"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#141518] border border-[#2e323b] text-white placeholder-[#5a606d] focus:outline-none focus:border-[#24a1de]"
                />
                <input
                  type="text"
                  placeholder="API Hash (e.g. 0123456789abcdef...)"
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#141518] border border-[#2e323b] text-white placeholder-[#5a606d] focus:outline-none focus:border-[#24a1de]"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-[#2e323b] hover:bg-[#3e434f] text-[11px] font-medium text-white transition cursor-pointer"
                >
                  {credsSaved ? '✓ Saved to Browser' : 'Save Credentials'}
                </button>
              </form>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};
