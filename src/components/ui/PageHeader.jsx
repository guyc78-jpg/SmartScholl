import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      dir="rtl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 text-right pt-1"
    >
      <div className="min-w-0 w-full sm:w-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug break-words">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug break-words">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap justify-start w-full sm:w-auto" dir="rtl">{actions}</div>}
    </motion.div>
  );
}