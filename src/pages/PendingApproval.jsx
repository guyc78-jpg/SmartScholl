import { motion } from 'framer-motion';
import { Clock, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const ROLE_LABELS = {
  homeroom_teacher: 'מחנך/ת',
  coordinator: 'רכז/ת שכבה',
};

export default function PendingApproval({ user }) {
  const { logout } = useAuth();
  const roleLabel = ROLE_LABELS[user?.requested_role] || 'צוות';
  const isRejected = user?.onboarding_status === 'rejected';

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-3xl border p-8 text-center space-y-5"
      >
        {isRejected ? (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">הגישה נדחתה</h1>
              <p className="text-sm text-muted-foreground">
                בקשתך לתפקיד <strong>{roleLabel}</strong> לא אושרה.<br />
                לבירורים, פנה/י למנהל בית הספר.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">ממתין/ה לאישור</h1>
              <p className="text-sm text-muted-foreground">
                בקשתך להצטרף כ<strong>{roleLabel}</strong> נשלחה לאישור.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-right space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                חשוב לדעת:
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                תפקידי <strong>מחנך/ת</strong> ו<strong>רכז/ת שכבה</strong> מוגדרים רק על ידי מנהל בית הספר.
                אם קיבלת חשבון מהמנהל — השתמש/י בו לכניסה.
              </p>
            </div>

            {user?.profile_full_name && (
              <div className="bg-muted rounded-xl p-3 text-sm text-right space-y-1">
                <p><span className="text-muted-foreground">שם: </span>{user.profile_full_name}</p>
                {user.profile_subject && <p><span className="text-muted-foreground">מקצוע: </span>{user.profile_subject}</p>}
                {(user.profile_class || user.profile_grade_managed) && (
                  <p><span className="text-muted-foreground">כיתה/שכבה: </span>{user.profile_class || user.profile_grade_managed}</p>
                )}
              </div>
            )}
          </>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => logout(false)}
        >
          <LogOut className="w-4 h-4" />
          התנתק/י
        </Button>
      </motion.div>
    </div>
  );
}
