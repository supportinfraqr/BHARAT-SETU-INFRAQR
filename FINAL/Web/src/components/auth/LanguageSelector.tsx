"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { locales, type Language } from '@/i18n';

interface LanguageSelectorProps {
  currentLang: Language;
  onLangChange: (code: Language) => void;
}

export default function LanguageSelector({ currentLang, onLangChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-5 right-14 z-40" ref={dropdownRef}>
      <button 
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-[#1E3A8A] transition-colors shadow-sm focus:outline-none group"
        title="Change Language"
      >
        <Globe className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {locales.map((lang) => (
            <button
              key={lang.code}
              onClick={(e) => {
                e.preventDefault();
                onLangChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-1.5 text-[12px] transition-colors ${
                currentLang === lang.code 
                  ? "bg-blue-50/70 text-[#1E3A8A] font-bold" 
                  : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {lang.abbreviation} — {lang.nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
