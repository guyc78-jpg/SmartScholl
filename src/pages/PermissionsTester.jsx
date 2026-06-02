import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Eye, Info } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import RoleSelector from '@/components/permissions/RoleSelector';
import SimulatedViewPreview from '@/components/permissions/SimulatedViewPreview';
import PermissionsMatrixTable from '@/components/permissions/PermissionsMatrixTable';
import { SIMULATABLE_ROLES } from '@/lib/permissionsMatrix';

export default function PermissionsTester() {
  const navigate = useNavigate();
  const [simRole, setSimRole] = useState(null);
  const activeLabel = SIMULATABLE_ROLES.find(r => r.value === simRole)?.label;

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4" dir="rtl">
      <PageHeader
        title="בדיקת הרשאות"
        subtitle="כלי סימולציה למנהל/ת מערכת — צפייה מדומה לפי תפקיד, ללא שינוי בנתונים"
        actions={
          <Button variant="outline" onClick={() => navigate('/users')} className="gap-1.5">
            <ArrowRight className="w-4 h-4" />
            חזרה לניהול הרשאות
          </Button>
        }
      />

      {/* באנר מצב סימולציה */}
      {simRole && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-secondary/15 border border-secondary/40 rounded-xl px-4 py-3" dir="rtl">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Eye className="w-4 h-4 text-secondary-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-right">
              מצב סימולציה פעיל — צפייה כ<span className="font-bold">{activeLabel}</span>. זוהי תצוגה מדומה בלבד, ללא שינוי אמיתי בנתונים.
            </span>
          </div>
          <Button size="sm" variant="default" onClick={() => setSimRole(null)} className="gap-1.5 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
            חזרה למצב מנהל/ת מערכת
          </Button>
        </div>
      )}

      {/* בורר תפקיד */}
      <div className="bg-card border rounded-2xl p-4" dir="rtl">
        <h2 className="font-semibold text-sm mb-3 text-right">בחר/י מצב צפייה לפי סוג משתמש</h2>
        <RoleSelector selectedRole={simRole} onSelect={setSimRole} />
      </div>

      {/* תצוגה מדומה */}
      {simRole ? (
        <SimulatedViewPreview role={simRole} />
      ) : (
        <div className="flex items-center gap-2 bg-accent/40 border border-accent rounded-xl px-4 py-3 text-sm text-muted-foreground" dir="rtl">
          <Info className="w-4 h-4 flex-shrink-0 text-primary" />
          בחר/י תפקיד למעלה כדי לראות תצוגה מדומה של התפריטים, המסכים והפעולות הזמינות עבורו.
        </div>
      )}

      {/* טבלת הרשאות מלאה */}
      <div className="space-y-2" dir="rtl">
        <h2 className="font-semibold text-base text-right">טבלת הרשאות מלאה</h2>
        <p className="text-xs text-muted-foreground text-right">מה כל תפקיד יכול לראות, להוסיף, לערוך, למחוק ולנהל בכל מסך.</p>
        <PermissionsMatrixTable highlightRole={simRole} />
      </div>
    </div>
  );
}