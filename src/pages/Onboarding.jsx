import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GraduationCap, BookOpen, Users, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';

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
    desc: 'ניהול כיתה, נוכחות, משמעת, הערכות ותקשורת עם הורים',
    approval: 'ממתין לאישור מנהל',
    approvalColor: 'text-amber-600',
  },
  {
    id: 'coordinator',
    label: 'רכז/ת שכבה',
    icon: Users,
    color: 'bg-purple-500',
    desc: 'ניהול שכבה, דוחות, מעקב תלמידים ותיאום בין כיתות',
    approval: 'ממתין לאישור מנהל',
    approvalColor: 'text-amber-600',
  },
];

const GUIDE = {
  student: {
    title: 'ברוך/ה הבא/ה, תלמיד/ה!',
    points: [
      'תוכל/י לראות את לוח השעות שלך ולעקוב אחרי מבחנים',
      'תקבל/י הודעות ועדכונים מהמחנך/ת שלך',
      'תוכל/י לעקוב אחר התקדמות המעורבות החברתית שלך',
    ],
  },
  homeroom_teacher: {
    title: 'ברוך/ה הבא/ה, מורה!',
    points: [
      'תוכל/י לנהל נוכחות, משמעת ומעקב תלמידים',
      'תוכל/י לתעד שיחות עם הורים ולהוציא דוחות',
      'הגישה המלאה תינתן לאחר אישור מנהל',
    ],
  },
  coordinator: {
    title: 'ברוך/ה הבא/ה, רכז/ת שכבה!',
    points: [
      'תוכל/י לנהל ולפקח על כל כיתות השכבה',
      'תקבל/י דוחות מרוכזים ותשלוט על הגדרות',
      'הגישה המלאה תינתן לאחר אישור מנהל',
    ],
  },
};

function StudentForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>שם מלא *</Label>
        <Input value={form.profile_full_name || ''} onChange={e => setForm(p => ({ ...p, profile_full_name: e.target.value }))} placeholder="למשל: יעל כהן" />
      </div>
      <div className="space-y-1">
        <Label>כיתה *</Label>
        <Input value={form.profile_class || ''} onChange={e => setForm(p => ({ ...p, profile_class: e.target.value }))} placeholder="למשל: י׳1" />
      </div>
      <div className="space-y-1">
        <Label>שם מחנך/ת</Label>
        <Input value={form.profile_homeroom_teacher || ''} onChange={e => setForm(p => ({ ...p, profile_homeroom_teacher: e.target.value }))} placeholder="למשל: ד״ר אבי לוי" />
      </div>
      <div className="space-y-1">
        <Label>מגמה/ות</Label>
        <Input value={form.profile_tracks || ''} onChange={e => setForm(p => ({ ...p, profile_tracks: e.target.value }))} placeholder="למשל: מדעים, מחשבים" />
      </div>
    </div>
  );
}

function TeacherForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>שם מלא *</Label>
        <Input value={form.profile_full_name || ''} onChange={e => setForm(p => ({ ...p, profile_full_name: e.target.value }))} placeholder="למשל: מיכל ברקוביץ" />
      </div>
      <div className="space-y-1">
        <Label>כיתה/ות הוראה *</Label>
        <Input value={form.profile_class || ''} onChange={e => setForm(p => ({ ...p, profile_class: e.target.value }))} placeholder="למשל: י׳1, י׳2, י״א3" />
      </div>
      <div className="space-y-1">
        <Label>מקצוע הוראה *</Label>
        <Input value={form.profile_subject || ''} onChange={e => setForm(p => ({ ...p, profile_subject: e.target.value }))} placeholder="למשל: מתמטיקה" />
      </div>
      <div className="space-y-1">
        <Label>תפקיד בבית הספר</Label>
        <Input value={form.profile_school_role || ''} onChange={e => setForm(p => ({ ...p, profile_school_role: e.target.value }))} placeholder="למשל: מחנך כיתה י׳1" />
      </div>
      <div className="space-y-1">
        <Label>תפקידים נוספים</Label>
        <Input value={form.profile_extra_roles || ''} onChange={e => setForm(p => ({ ...p, profile_extra_roles: e.target.value }))} placeholder="למשל: רכז ביטחון, מנהל מעבדה" />
      </div>
    </div>
  );
}

function CoordinatorForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>שם מלא *</Label>
        <Input value={form.profile_full_name || ''} onChange={e => setForm(p => ({ ...p, profile_full_name: e.target.value }))} placeholder="למשל: ניר שמואלי" />
      </div>
      <div className="space-y-1">
        <Label>שכבה בניהול *</Label>
        <Input value={form.profile_grade_managed || ''} onChange={e => setForm(p => ({ ...p, profile_grade_managed: e.target.value }))} placeholder="למשל: שכבת י׳" />
      </div>
      <div className="space-y-1">
        <Label>כיתת חינוך</Label>
        <Input value={form.profile_homeroom_class || ''} onChange={e => setForm(p => ({ ...p, profile_homeroom_class: e.target.value }))} placeholder="למשל: י׳2" />
      </div>
      <div className="space-y-1">
        <Label>מקצוע הוראה</Label>
        <Input value={form.profile_subject || ''} onChange={e => setForm(p => ({ ...p, profile_subject: e.target.value }))} placeholder="למשל: היסטוריה" />
      </div>
      <div className="space-y-1">
        <Label>תפקידים נוספים</Label>
        <Input value={form.profile_extra_roles || ''} onChange={e => setForm(p => ({ ...p, profile_extra_roles: e.target.value }))} placeholder="למשל: רכז תרבות, רכז ביטחון" />
      </div>
    </div>
  );
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0); // 0=role, 1=guide, 2=form, 3=done
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const roleInfo = ROLE_OPTIONS.find(r => r.id === selectedRole);
  const guide = GUIDE[selectedRole];

  function validateForm() {
    if (!form.profile_full_name?.trim()) { toast.error('יש להזין שם מלא'); return false; }
    if (selectedRole === 'student' && !form.profile_class?.trim()) { toast.error('יש להזין כיתה'); return false; }
    if (selectedRole === 'homeroom_teacher' && (!form.profile_class?.trim() || !form.profile_subject?.trim())) { toast.error('יש למלא כיתות ומקצוע'); return false; }
    if (selectedRole === 'coordinator' && !form.profile_grade_managed?.trim()) { toast.error('יש להזין שכבה בניהול'); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    setSaving(true);
    const isStudentRole = selectedRole === 'student';

    // Save profile data first
    const updateData = {
      ...form,
      requested_role: selectedRole,
      role: isStudentRole ? 'student' : user?.role || 'student',
      onboarding_status: isStudentRole ? 'approved' : 'awaiting_approval',
    };
    await base44.auth.updateMe(updateData);

    // For staff roles: send approval request + notifications via backend
    if (!isStudentRole) {
      await base44.functions.invoke('handleApprovalRequest', {
        action: 'submit',
        full_name: form.profile_full_name,
        requested_role: selectedRole,
        class_or_grade: form.profile_class || form.profile_grade_managed || '',
        subject: form.profile_subject || '',
        school_role: form.profile_school_role || '',
        extra_roles: form.profile_extra_roles || '',
      }).catch(() => {}); // Don't block UI if function fails
    }

    setSaving(false);
    setStep(3);
    if (isStudentRole) {
      setTimeout(() => onComplete(updateData), 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        {step < 3 && (
          <div className="flex justify-center gap-2 mb-6">
            {[0,1,2].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-8 bg-primary' : 'w-4 bg-muted'}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* Step 0: Choose role */}
          {step === 0 && (
            <motion.div key="role" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground">ברוך/ה הבא/ה לכיתה חכמה!</h1>
                <p className="text-muted-foreground mt-1 text-sm">בחר/י את תפקידך כדי להתאים את הממשק עבורך</p>
              </div>
              <div className="space-y-3">
                {ROLE_OPTIONS.map(r => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex items-center gap-4
                        ${selectedRole === r.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'}`}
                    >
                      <div className={`w-12 h-12 ${r.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{r.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                        <p className={`text-xs font-medium mt-1 ${r.approvalColor}`}>{r.approval}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                className="w-full mt-5 gap-2"
                disabled={!selectedRole}
                onClick={() => setStep(1)}
              >
                המשך <ChevronLeft className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 1: Guide */}
          {step === 1 && guide && (
            <motion.div key="guide" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="bg-card rounded-3xl border p-6">
                <div className={`w-14 h-14 ${roleInfo.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <roleInfo.icon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-center mb-4">{guide.title}</h2>
                <div className="space-y-3 mb-6">
                  {guide.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{pt}</p>
                    </div>
                  ))}
                </div>
                {selectedRole !== 'student' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2 mb-4">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">בקשתך תועבר לאישור מנהל. עד לאישור תוכל/י לגלוש באפליקציה עם גישה מוגבלת.</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(0)}>
                    <ChevronRight className="w-4 h-4" /> חזור
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => setStep(2)}>
                    המשך למילוי פרופיל <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Profile form */}
          {step === 2 && (
            <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="bg-card rounded-3xl border p-6">
                <h2 className="text-lg font-bold mb-4">מילוי פרטי פרופיל</h2>
                {selectedRole === 'student' && <StudentForm form={form} setForm={setForm} />}
                {selectedRole === 'homeroom_teacher' && <TeacherForm form={form} setForm={setForm} />}
                {selectedRole === 'coordinator' && <CoordinatorForm form={form} setForm={setForm} />}
                <div className="flex gap-3 mt-5">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                    <ChevronRight className="w-4 h-4" /> חזור
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'שומר...' : 'סיים הרשמה'} <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-card rounded-3xl border p-8 text-center">
                {selectedRole === 'student' ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">הרשמה הושלמה!</h2>
                    <p className="text-muted-foreground text-sm mt-2">ברוך/ה הבא/ה לכיתה חכמה</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">הבקשה נשלחה!</h2>
                    <p className="text-muted-foreground text-sm mt-2 mb-4">בקשתך ממתינה לאישור מנהל. תקבל/י הודעה בעת האישור.</p>
                    <Button className="w-full" onClick={() => onComplete({ ...form, requested_role: selectedRole, onboarding_status: 'awaiting_approval', role: user?.role || 'student' })}>
                      כניסה לאפליקציה עם גישה מוגבלת
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}