"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-flowBg dark:bg-[#191A1F]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Image
            src="/availo-icon.png"
            alt="Availo"
            width={60}
            height={60}
            priority
          />
        </motion.div>
        <p className="text-sm text-flowTextMuted dark:text-gray-400">
          Loading...
        </p>
      </motion.div>
    </div>
  );
}

