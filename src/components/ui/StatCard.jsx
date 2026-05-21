import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, title, value, subtitle, color = 'green', onClick, urgent }) {
  // Education-warm palette: cream cards with soft brown border, green/amber/coral icon chips
  const variants = {
    green:  { card: 'bg-[#FAF7F2] border-[#E8DFD2]', chip: 'bg-[#E7F1EB] text-[#047857]' },
    amber:  { card: 'bg-[#FBF6E9] border-[#E8DFD2]', chip: 'bg-[#FBEBC1] text-[#B45309]' },
    red:    { card: 'bg-[#FAF7F2] border-[#E8DFD2]', chip: 'bg-[#FBE3DA] text-[#B91C1C]' },
    blue:   { card: 'bg-[#FAF7F2] border-[#E8DFD2]', chip: 'bg-[#DDEAF5] text-[#1E5F8C]' },
    purple: { card: 'bg-[#FAF7F2] border-[#E8DFD2]', chip: 'bg-[#EDE3F1] text-[#6D28D9]' },
    slate:  { card: 'bg-[#FAF7F2] border-[#E8DFD2]', chip: 'bg-[#ECEAE3] text-[#4B5563]' },
  };
  const v = variants[color] || variants.green;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-4 transition-shadow dark:bg-card dark:border-border',
        v.card,
        onClick && 'cursor-pointer hover:shadow-md',
        urgent && 'ring-2 ring-[#B91C1C]/60'
      )}
    >
      <div className="flex items-start justify-between gap-3 text-right" dir="rtl">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/80 leading-tight">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', v.chip)}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </motion.div>
  );
}