import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center px-4 py-10 rounded-2xl border border-dashed border-border bg-muted/30"
    >
      {Icon && (
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </motion.div>
  );
}