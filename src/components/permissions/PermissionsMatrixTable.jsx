import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULES, CAPABILITIES, SIMULATABLE_ROLES, getModulePermissions } from '@/lib/permissionsMatrix';

export default function PermissionsMatrixTable({ highlightRole }) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-right font-semibold px-3 py-2.5 sticky right-0 bg-muted/40 min-w-[140px]">מסך / מודול</th>
              {SIMULATABLE_ROLES.map(role => (
                <th
                  key={role.value}
                  className={cn(
                    'text-center font-semibold px-2 py-2.5 whitespace-nowrap min-w-[120px]',
                    highlightRole === role.value && 'bg-primary/10 text-primary'
                  )}
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, idx) => (
              <tr key={mod.key} className={cn('border-b last:border-b-0', idx % 2 === 1 && 'bg-muted/20')}>
                <td className="text-right font-medium px-3 py-2.5 sticky right-0 bg-inherit">{mod.label}</td>
                {SIMULATABLE_ROLES.map(role => {
                  const caps = getModulePermissions(mod.key, role.value);
                  return (
                    <td
                      key={role.value}
                      className={cn('px-2 py-2.5 text-center', highlightRole === role.value && 'bg-primary/5')}
                    >
                      {caps.length === 0 ? (
                        <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {CAPABILITIES.filter(c => caps.includes(c.key)).map(c => (
                            <span
                              key={c.key}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10.5px] font-medium whitespace-nowrap"
                            >
                              <Check className="w-2.5 h-2.5" />
                              {c.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}