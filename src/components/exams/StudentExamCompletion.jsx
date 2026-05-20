import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw } from 'lucide-react';

export default function StudentExamCompletion({ completed, celebrating, onToggle }) {
  return (
    <div className="relative flex items-center gap-2" dir="rtl">
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 8 }}
            animate={{ scale: 1.35, opacity: 1, y: -8 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none text-2xl"
          >
            ✅
          </motion.div>
        )}
      </AnimatePresence>

      {completed && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" />בוצע
        </span>
      )}

      <Button
        size="sm"
        variant={completed ? 'outline' : 'secondary'}
        className="h-8 text-xs gap-1.5"
        onClick={onToggle}
      >
        {completed ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {completed ? 'בטל סימון' : 'סיימתי את המבחן'}
      </Button>
    </div>
  );
}