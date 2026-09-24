import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * A single transient message with one optional action. Sits above the FAB and
 * below the sheet, and never blocks the canvas.
 */
export function Toast({ message, actionLabel, onAction, onDismiss, timeout = 14000 }: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  timeout?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, timeout);
    return () => clearTimeout(id);
  }, [message, timeout, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="safe-toast fixed inset-x-0 z-30 mx-auto flex w-[min(24rem,calc(100vw-6.5rem))]
            items-center gap-3 rounded-2xl border border-[#232c3f] bg-[#10141ef2] px-4 py-3
            text-sm shadow-[0_8px_30px_#0009] backdrop-blur"
        >
          {/* Confirmation reads as a checkmark, not just a green tint. */}
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
            bg-[#12281c] text-[var(--green)]">✓</span>
          <span className="min-w-0 flex-1 text-pretty">{message}</span>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 rounded-lg border border-[#2c3850] px-3 py-1.5 text-xs font-semibold
                text-[var(--text)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)]"
            >
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
