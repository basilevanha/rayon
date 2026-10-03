import { motion, useReducedMotion } from "motion/react";
import { UNDO_MS } from "@/features/articles/article-list";

// UI-11 : minuteur de 6 secondes sous le toast d'une action globale.
export function UndoTimer() {
  const reduceMotion = useReducedMotion();
  return (
    <span aria-hidden className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.span
        className="block h-full bg-primary"
        initial={{ width: "100%", opacity: 1 }}
        animate={reduceMotion ? { opacity: 0.4 } : { width: "0%" }}
        transition={{ duration: UNDO_MS / 1000, ease: "linear" }}
      />
    </span>
  );
}
