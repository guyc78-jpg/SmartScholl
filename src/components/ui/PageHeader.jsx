import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      dir="rtl"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-right"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-row-reverse items-center gap-2 flex-wrap justify-end sm:justify-start w-full sm:w-auto">{actions}</div>}
    </motion.div>
  );
}