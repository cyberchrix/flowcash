"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: "#191A1F",
        zIndex: 9999,
      }}
    >
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Image
          src="/availo-icon.png"
          alt="Availo"
          width={80}
          height={80}
          priority
        />
      </motion.div>
    </motion.div>
  );
}

