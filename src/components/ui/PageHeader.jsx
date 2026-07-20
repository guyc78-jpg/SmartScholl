import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      dir="rtl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-3 sm:gap-5 mb-5 sm:mb-7 text-right pt-2"
    >
      <div className="min-w-0 w-full sm:w-auto">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground leading-tight break-words">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed break-words">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap justify-start w-full sm:w-auto" dir="rtl">{actions}</div>}
    </motion.div>
  );
}