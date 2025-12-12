"use client";

import { useEffect } from "react";
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    info: InformationCircleIcon,
    warning: ExclamationCircleIcon,
  };

  const colors = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-200",
      icon: "text-green-600 dark:text-green-400",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-200",
      icon: "text-red-600 dark:text-red-400",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-200",
      icon: "text-blue-600 dark:text-blue-400",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-800 dark:text-yellow-200",
      icon: "text-yellow-600 dark:text-yellow-400",
    },
  };

  const Icon = icons[toast.type];
  const colorScheme = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text}
        min-w-[280px] max-w-[90vw] md:max-w-md
      `}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${colorScheme.icon}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className={`
          flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10
          ${colorScheme.text} transition-colors
        `}
        aria-label="Close notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 right-4 md:right-4 md:left-auto -translate-x-1/2 md:translate-x-0 z-50 flex flex-col gap-2 pointer-events-none items-center md:items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastComponent toast={toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

