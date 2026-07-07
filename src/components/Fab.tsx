import { motion } from "motion/react";

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onClick}
      aria-label="Add income or expense"
      className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full
        bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-2xl font-bold text-[#03140c]
        shadow-[0_0_30px_#34f5a077]">
      +
    </motion.button>
  );
}
