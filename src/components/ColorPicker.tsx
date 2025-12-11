"use client";

import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bouton de déclenchement */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
        style={{ backgroundColor: value }}
        title="Choose color"
      />

      {/* Popup du color picker */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-[99]"
            onClick={() => setIsOpen(false)}
          />
          {/* Color picker popup */}
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-gray-50 rounded-[32px] shadow-2xl border border-gray-200 p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            }}
          >
            <div className="flex gap-6 items-center">
              {/* Color picker */}
              <div className="relative">
                <HexColorPicker
                  color={value}
                  onChange={onChange}
                  style={{ width: "144px", height: "144px" }}
                />
              </div>

              {/* Aperçu et valeurs */}
              <div className="flex flex-col gap-4">
                <div>
                  <div
                    className="w-16 h-16 rounded-xl border-2 border-gray-300 mb-3 shadow-inner"
                    style={{ backgroundColor: value }}
                  />
                  <div className="text-xs font-mono text-gray-700 font-semibold">{value.toUpperCase()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
