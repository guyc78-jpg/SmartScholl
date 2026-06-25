import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GradeClassSelect from '@/components/profile/GradeClassSelect';
import { extractGradeFromClass } from '@/lib/schoolStructure';
import { toast } from 'sonner';
import { getUserDisplayName } from '@/lib/roleUtils';
import {
  GraduationCap, BookOpen, Users, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Lock, Eye, EyeOff, ShieldCheck
} from 'lucide-react';

/* ─── Role guide content ─── */
const GUIDE = {
  student: {
    title: 'ברוך/ה הבא/ה, תלמיד/ה!',
    color: 'bg-blue-500',
    icon: GraduationCap,
    points: [
      'תוכל/י לראות את לוח השעות שלך ולעקוב אחרי מבחנים',
      'תקבל/י הודעות ועדכונים מהמחנך/ת שלך',
      'תוכל/י לעקוב אחר התקדמות המעורבות החברתית שלך',
      'אינך יכול/ה לגשת למסכי צוות בית הספר',
    ],
  },
  homeroom_teacher: {
    title: 'ברוך/ה הבא/ה, מחנך/ת!',
    color: 'bg-emerald-500',
    icon: BookOpen,
    points: [
      'תוכל/י לנהל את הכיתה שלך: נוכחות, משמעת ומעקב תלמידים',
      'תוכל/י לתעד שיחות עם הורים ולהוציא דוחות',
      'תוכל/י להוסיף הערות ומשימות טיפול לתלמידים',
      'הגישה שלך מוגבלת לכיתה שהוגדרה לך בלבד',
    ],
  },
  coordinator: {
    title: 'ברוך/ה הבא/ה, רכז/ת שכבה!',
    color: 'bg-purple-500',
    icon: Users,
    points: [
      'תוכל/י לפקח על כל כיתות השכבה שהוגדרה לך',
      'תקבל/י דוחות מרוכזים לרוחב השכבה',
      'תוכל/י לשתף פעולה עם המחנכים ולהוסיף הערות',
      'הגישה שלך מוגבלת לשכבה שאושרה לך על ידי המנהל',
    ],
  },
};

/* ─── Role options for new sign-ups (students only self-register) ─── */
const ROLE_OPTIONS = [
  {
    id: 'student',
    label: 'תלמיד/ה',
    icon: GraduationCap,
    color: 'bg-blue-500',
    desc: 'גישה ללוח שעות, מבחנים, הודעות ומעורבות חברתית',
    approval: 'אישור מיידי',
    approvalColor: 'text-emerald-600',
  },
  {
    id: 'homeroom_teacher',
    label: 'מורה / מחנך/ת',
    icon: BookOpen,
    color: 'bg-emerald-500',
    desc: 'כניסה עם Google לפי מייל שאושר מראש ע״י מנהל בית הספר',
    approval: 'ללא סיסמה זמנית',
    approvalColor: 'text-red-500',
    disabled: true,
  },
  {
    id: 'coordinator',
    label: 'רכז/ת שכבה',
    icon: Users,
    color: 'bg-purple-500',
    desc: 'כניסה עם Google לפי מייל שאושר מראש ע״י מנהל בית הספר',
    approval: 'ללא סיסמה זמנית',
    approvalColor: 'text-red-500',
    disabled: true,
  },
];

/* ─── Forms ─── */
function StudentProfileForm({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>שם מלא *</Label>
        <Input value={form.profile_full_name || ''} onChange={e => setForm(p => ({ ...p, profile_full_name: e.target.value }))} placeholder="למשל: יעל כהן" />
      </div>
      <GradeClassSelect
        grade={form.profile_grade_managed || extractGradeFromClass(form.profile_class || '')}
        classNameValue={form.profile_class || ''}
        classId={form.profile_class_id || ''}
        onGradeChange={(value) => setForm(p => ({ ...p, profile_grade_managed: value, profile_class: '', profile_class_id: '' }))}
        onClassChange={(value) => setForm(p => ({ ...p, profile_class: value, profile_homeroom_class: value }))}
        onClassIdChange={(value) => setForm(p => ({ ...p, profile_class_id: value }))}
      />

      <div className="space-y-1">
        <Label>מגמה/ות</Label>
        <Input value={form.profile_tracks || ''} onChange={e => setForm(p => ({ ...p, profile_tracks: e.target.value }))} placeholder="למשל: מדעים, מחשבים" />
      </div>
    </div>
  );
}

/* ─── Change password form ─── */
function ChangePasswordForm({ onSave }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (pw.length < 8) { toast.error('הסיסמה חייבת להכיל לפחות 8 תווים'); return; }
    if (pw !== pw2) { toast.error('הסיסמאות אינן תואמות'); return; }
    setSaving(true);
    await base44.auth.updateMe({ must_change_password: false });
    toast.success('הסיסמה עודכנה בהצלחה!');
    setSaving(false);
    onSave();
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2">
        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          חשבון זה נוצר על ידי מנהל בית הספר. עליך להגדיר סיסמה אישית לפני הכניסה.
        </p>
      </div>
      <div className="space-y-1">
        <Label>סיסמה חדשה *</Label>
        <div className="relative">
          <Input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="לפחות 8 תווים"
            className="pl-10"
          />
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShow(v => !v)}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <Label>אימות סיסמה *</Label>
        <Input
          type={show ? 'text' : 'password'}
          value={pw2}
          onChange={e => setPw2(e.target.value)}
          placeholder="הזן/י שוב"
        />
      </div>
      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        {saving ? 'שומר...' : (<><ShieldCheck className="w-4 h-4" /> אפס סיסמה והמשך</>)}
      </Button>
    </div>
  );
}

/* ─── Role guide screen ─── */
function RoleGuideScreen({ role, userName, onContinue }) {
  const guide = GUIDE[role];
  if (!guide) { onContinue(); return null; }
  const Icon = guide.icon;

  return (
    <motion.div key="guide" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <div className="bg-card rounded-3xl border p-6">
        <div className={`w-14 h-14 ${guide.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-center mb-1">{guide.title}</h2>
        {userName && <p className="text-sm text-muted-foreground text-center mb-4">{userName}</p>}
        <div className="space-y-3 mb-5">
          {guide.points.map((pt, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{pt}</p>
            </div>
          ))}
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5 text-xs text-primary">
          <strong>הרשאותיך נקבעו על ידי מנהל בית הספר</strong> ואינן ניתנות לשינוי עצמי.
        </div>
        <Button className="w-full gap-2" onClick={onContinue}>
          כניסה לאפליקציה <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Main Onboarding component ─── */
export default function Onboarding({ user, onComplete }) {
  // Determine flow type
  const isAdminCreated = user?.pre_created_by_admin === true;
  const mustChangePw = user?.must_change_password === true;
  const role = user?.role || 'student';

  // For admin-created staff: step 0=change password (if needed), step 1=guide, step 2=done
  // For new Google sign-up: step 0=role select, step 1=guide, step 2=profile form, step 3=done
  const [step, setStep] = useState(() => {
    if (isAdminCreated) return mustChangePw ? 'change_pw' : 'guide';
    return 'role';
  });

  const [profileForm, setProfileForm] = useState({});
  const [saving, setSaving] = useState(false);

  /* Admin-created flow */
  if (isAdminCreated) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50" dir="rtl">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 'change_pw' && (
              <motion.div key="changepw" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold">שינוי סיסמה חובה</h1>
                  <p className="text-sm text-muted-foreground mt-1">כניסה ראשונה – עליך להגדיר סיסמה אישית</p>
                </div>
                <div className="bg-card rounded-3xl border p-6">
                  <ChangePasswordForm onSave={() => setStep('guide')} />
                </div>
              </motion.div>
            )}

            {step === 'guide' && (
              <RoleGuideScreen
                role={role}
                userName={getUserDisplayName(user)}
                onContinue={async () => {
                  await base44.auth.updateMe({ onboarding_status: 'approved' });
                  onComplete({ ...user, onboarding_status: 'approved' });
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  async function activateApprovedStaff() {
    setSaving(true);
    const res = await base44.functions.invoke('handleApprovalRequest', { action: 'activate_approved_staff' });
    if (res.data.found) {
      onComplete(res.data.user);
      return;
    }
    toast.error('המייל שלך לא נמצא ברשימת הצוות המאושרת. יש לפנות למנהל/ת המערכת.');
    setSaving(false);
  }

  /* New user self-registration flow — only students allowed to self-register */
  async function handleSubmitStudent() {
    if (!profileForm.profile_full_name?.trim()) { toast.error('יש להזין שם מלא'); return; }
    if (!profileForm.profile_grade_managed?.trim()) { toast.error('יש לבחור שכבה'); return; }
    if (!profileForm.profile_class_id?.trim()) { toast.error('יש לבחור כיתה מתוך הרשימה'); return; }
    setSaving(true);
    try {
      // Do NOT update role/permissions from client — only safe profile fields.
      const updateData = {
        profile_full_name: profileForm.profile_full_name?.trim(),
        profile_grade_managed: profileForm.profile_grade_managed,
        profile_class_id: profileForm.profile_class_id,
        profile_class: profileForm.profile_class,
        profile_homeroom_class: profileForm.profile_class,
        profile_homeroom_teacher: profileForm.profile_homeroom_teacher?.trim() || '',
        profile_tracks: profileForm.profile_tracks?.trim() || '',
        onboarding_status: 'approved',
        onboardingCompleted: true,
      };
      const updatedUser = await base44.auth.updateMe(updateData);
      onComplete(updatedUser);
    } catch (err) {
      toast.error('שגיאה בשמירת הפרופיל: ' + (err?.message || 'אנא נסה שוב'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* Step: role selector */}
          {step === 'role' && (
            <motion.div key="role" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground">ברוך/ה הבא/ה לכיתה חכמה!</h1>
                <p className="text-muted-foreground mt-1 text-sm">צוות בית הספר מזוהה אוטומטית לפי מייל Google מאושר מראש</p>
              </div>

              <div className="bg-card rounded-2xl border p-4 mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">כניסת צוות מאושר</p>
                    <p className="text-xs text-muted-foreground mt-0.5">אין בחירת תפקיד ידנית — המערכת תטען תפקיד ושיוך לפי המייל שלך</p>
                    <p className="text-xs font-medium mt-1 text-primary">ללא סיסמה זמנית</p>
                  </div>
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                <Button className="w-full mt-4 gap-2" disabled={saving} onClick={activateApprovedStaff}>
                  {saving ? 'בודק הרשאה...' : 'בדוק הרשאת צוות והמשך'}
                </Button>
              </div>

              <button
                onClick={() => setStep('profile')}
                className="w-full text-right p-4 rounded-2xl border-2 transition-all flex items-center gap-4 border-border bg-card hover:border-primary/40 hover:bg-muted/50"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">תלמיד/ה</p>
                  <p className="text-xs text-muted-foreground mt-0.5">גישה ללוח שעות, מבחנים, הודעות ומעורבות חברתית</p>
                  <p className="text-xs font-medium mt-1 text-emerald-600">אישור מיידי</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>

              <div className="mt-4 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
                <strong>מחנכים ורכזי שכבה</strong> — התחברו עם Google באימייל שאושר מראש על ידי מנהל/ת המערכת.
              </div>
            </motion.div>
          )}

          {/* Step: student profile */}
          {step === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="bg-card rounded-3xl border p-6">
                <h2 className="text-lg font-bold mb-4">מילוי פרטי פרופיל</h2>
                <StudentProfileForm form={profileForm} setForm={setProfileForm} />
                <div className="flex gap-3 mt-5">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep('role')}>
                    <ChevronRight className="w-4 h-4" /> חזור
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSubmitStudent} disabled={saving}>
                    {saving ? 'שומר...' : (<>סיים הרשמה <ChevronLeft className="w-4 h-4" /></>)}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step: student guide after registration */}
          {step === 'student_guide' && (
            <RoleGuideScreen
              role="student"
              userName={profileForm.profile_full_name}
              onContinue={() => onComplete({ ...profileForm, role: 'student', onboarding_status: 'approved' })}
            />
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}