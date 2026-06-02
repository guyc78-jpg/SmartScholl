import { cn } from '@/lib/utils';
import { Check, Lock, Menu as MenuIcon, MonitorSmartphone } from 'lucide-react';
import { MODULES, CAPABILITIES, ROLE_SCOPE, getModulePermissions, canRoleAccessModule } from '@/lib/permissionsMatrix';

export default function SimulatedViewPreview({ role }) {
  const accessible = MODULES.filter(m => canRoleAccessModule(m.key, role));
  const blocked = MODULES.filter(m => !canRoleAccessModule(m.key, role));

  return (
    <div className="grid lg:grid-cols-2 gap-3" dir="rtl">
      {/* תפריטים ומסכים זמינים */}
      <div className="bg-card border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MenuIcon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-right">תפריטים ומסכים זמינים</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3 text-right">{ROLE_SCOPE[role]}</p>
        <div className="space-y-1.5">
          {accessible.map(mod => {
            const caps = getModulePermissions(mod.key, role);
            return (
              <div key={mod.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium flex-1 text-right">{mod.label}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {CAPABILITIES.filter(c => caps.includes(c.key)).map(c => (
                    <span key={c.key} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium whitespace-nowrap">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* חסימות הרשאה */}
      <div className="bg-card border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-destructive" />
          <h3 className="font-semibold text-sm text-right">חסום עבור תפקיד זה</h3>
        </div>
        {blocked.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <MonitorSmartphone className="w-4 h-4" />
            אין מסכים חסומים — לתפקיד זה גישה לכל המסכים.
          </div>
        ) : (
          <div className="space-y-1.5">
            {blocked.map(mod => (
              <div key={mod.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5">
                <Lock className="w-3.5 h-3.5 text-destructive/70 flex-shrink-0" />
                <span className={cn('text-sm flex-1 text-right text-muted-foreground line-through')}>{mod.label}</span>
                <span className="text-[10px] text-destructive/80 font-medium">אין גישה</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}