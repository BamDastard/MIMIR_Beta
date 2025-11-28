import React, { useRef } from 'react';
import { Upload, ChefHat, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  personalityIntensity: number;
  setPersonalityIntensity: (value: number) => void;
  uploadStatus: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cookingMode: boolean;
  setCookingMode: (mode: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function LeftSidebar({
  personalityIntensity,
  setPersonalityIntensity,
  uploadStatus,
  onFileUpload,
  cookingMode,
  setCookingMode,
  isOpen,
  onClose
}: LeftSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (cookingMode) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed left-0 top-0 h-full w-72 bg-black/95 border-r border-white/10 z-50 p-6 flex flex-col gap-6 transition-transform duration-300 ease-in-out md:left-4 md:top-24 md:h-auto md:w-auto md:bg-transparent md:border-none md:z-40 md:p-0 md:gap-4",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between md:hidden">
          <span className="text-lg font-cinzel text-primary-glow">Settings</span>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Personality Intensity Dial */}
        <div className="glass-panel p-4 rounded-lg w-48">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">
                Personality
              </span>
              <span className="text-xs text-primary-glow font-mono">
                {personalityIntensity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={personalityIntensity}
              onChange={(e) => setPersonalityIntensity(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:bg-primary-glow
              [&::-webkit-slider-thumb]:transition-colors
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-primary
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:hover:bg-primary-glow
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:transition-colors"
            />
            <div className="flex justify-between text-xs text-foreground/50">
              <span>Subtle</span>
              <span>Full Norse</span>
            </div>
          </div>
        </div>

        {/* Upload Document Tile */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-48"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="w-6 h-6 text-primary group-hover:text-primary-glow transition-colors" />
            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              Upload Document
            </span>
            {uploadStatus && (
              <span className="text-xs text-primary-glow mt-1">
                {uploadStatus}
              </span>
            )}
          </div>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp"
          onChange={onFileUpload}
          className="hidden"
        />

        {/* Cooking Mode Button */}
        <button
          onClick={() => setCookingMode(!cookingMode)}
          className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-48 mt-auto"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <ChefHat className="w-6 h-6 text-primary group-hover:text-primary-glow transition-colors" />
            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
              Cooking Mode
            </span>
          </div>
        </button>
      </div>
    </>
  );
}
