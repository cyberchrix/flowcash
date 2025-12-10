"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-flowBg">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Image
          src="/availo-icon_v6.png"
          alt="Availo Icon"
          width={80}
          height={80}
          priority
        />
      </motion.div>
    </div>
  );
}

