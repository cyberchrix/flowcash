"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  disableClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, disableClose = false }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={disableClose ? undefined : onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#262A35] shadow-xl overflow-hidden"
              style={{
                fontFamily:
                  'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
                maxWidth: "calc(100vw - 2rem)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-4 sm:px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white/50">{title}</h2>
                {!disableClose && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-gray-400 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="px-4 sm:px-6 py-4 overflow-x-hidden">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

