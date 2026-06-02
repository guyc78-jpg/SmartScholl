import { ShieldCheck, Eye, Info, GraduationCap, UserCheck, Users, Building2, Settings } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';
import { useSimulation, SIM_ROLES } from '@/lib/SimulationContext';
import { ROLE_SCOPE } from '@/lib/permissionsMatrix';

const ROLE_ICONS = {
  student: GraduationCap,
  homeroom_teacher: UserCheck,
  coordinator: Users,
  division_manager: Building2,
  admin: Settings,
};

const ADMIN_SCOPE = 'גישה מלאה לכל המסכים, ההגדרות וניהול המערכת.';

export default function PermissionsTester() {
  const { startSimulation } = useSimulation();

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="סימולציית משתמש"
        subtitle="היכנס/י לצפייה אמיתית כאילו התחברת בתפקיד אחר — סרגל ניווט, מסכים, פעולות והרשאות"
      />

      <div className="flex items-start gap-2 bg-accent/40 border border-accent rounded-xl px-4 py-3 text-sm" dir="rtl">
        <Info className="w-4 h-4 flex-shrink-0 text-primary mt-0.5" />
        <p className="text-right text-muted-foreground">
          בחירת תפקיד תעביר את כל האפליקציה למצב סימולציה מלא. פס עליון קבוע יציין את מצב הסימולציה ויאפשר חזרה.
          במצב זה כל פעולה היא תצוגה מדומה בלבד — לא יישמרו שינויים בנתונים האמיתיים.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5" dir="rtl">
        {SIM_ROLES.map(role => {
          const Icon = ROLE_ICONS[role.value] || Eye;
          const scope = role.value === 'admin' ? ADMIN_SCOPE : ROLE_SCOPE[role.value];
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => startSimulation(role.value)}
              className={cn(
                'flex items-start gap-3 px-4 py-4 rounded-xl border text-right transition-colors',
                'bg-card hover:bg-muted/60 hover:border-primary/40'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  צפה כ{role.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{scope}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1" dir="rtl">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-right">היציאה ממצב סימולציה זמינה בכל רגע מהפס העליון או מתפריט ההגדרות.</span>
      </div>
    </div>
  );
}