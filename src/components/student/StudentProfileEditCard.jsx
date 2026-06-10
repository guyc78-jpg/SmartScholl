import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ImagePlus, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';

const AVATARS = [
  { value: 'male_student', label: 'תלמיד', icon: '👨‍🎓' },
  { value: 'female_student', label: 'תלמידה', icon: '👩‍🎓' },
];

// כרטיס עריכת פרטים אישיים לתלמיד/ה — שם, טלפון, כתובת, מייל (רק אם ריק), מגדר ותמונה/אוואטר
export default function StudentProfileEditCard({ student, user, onSaved }) {
  const inputRef = useRef(null);
  const emailLocked = Boolean(student.email);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    firstName: student.firstName || student.first_name || '',
    lastName: student.lastName || student.last_name || '',
    phone: student.phone || '',
    address: student.address || '',
    email: student.email || '',
    gender: student.gender || (user?.profile_gender === 'female' ? 'נקבה' : user?.profile_gender === 'male' ? 'זכר' : ''),
    photo_url: student.photo_url || user?.profile_photo_url || '',
    image_mode: user?.profile_image_mode === 'photo' || student.photo_url ? 'photo' : 'avatar',
    avatar: AVATARS.some(a => a.value === user?.profile_avatar) ? user.profile_avatar : '',
  });

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
  const activeAvatar = form.avatar || (form.gender === 'נקבה' ? 'female_student' : 'male_student');

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set({ photo_url: file_url, image_mode: 'photo' });
    toast.success('התמונה הועלתה');
    setUploading(false);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error('יש למלא שם פרטי ושם משפחה'); return; }
    if (!form.gender) { toast.error('יש לבחור זכר או נקבה'); return; }
    setSaving(true);
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fullName = `${firstName} ${lastName}`;

    const studentPatch = {
      firstName, lastName,
      first_name: firstName, last_name: lastName,
      full_name: fullName, fullName,
      phone: form.phone.trim(),
      address: form.address.trim(),
      gender: form.gender,
      photo_url: form.image_mode === 'photo' ? form.photo_url : student.photo_url || '',
      user_email: user.email,
    };
    if (!emailLocked && form.email.trim()) studentPatch.email = form.email.trim();
    await base44.entities.Student.update(student.id, studentPatch);

    await base44.auth.updateMe({
      profile_full_name: fullName,
      profile_phone: form.phone.trim(),
      profile_gender: form.gender === 'נקבה' ? 'female' : 'male',
      profile_avatar: activeAvatar,
      profile_photo_url: form.photo_url || '',
      profile_image_mode: form.image_mode,
    });

    toast.success('הפרופיל עודכן בהצלחה');
    setSaving(false);
    onSaved?.();
  };

  return (
    <Card dir="rtl">
      <CardHeader className="text-right">
        <CardTitle className="flex items-center gap-2">
          <UserRound className="w-5 h-5 text-primary" />
          הפרטים שלי
        </CardTitle>
        <CardDescription>עדכון פרטים אישיים, מגדר ותמונת פרופיל</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-right">
        {/* תמונה / אוואטר */}
        <div className="rounded-xl border bg-muted/20 p-3 space-y-3" dir="rtl">
          <div className="flex items-start justify-between gap-3" dir="rtl">
            <div className="text-right">
              <Label className="text-xs font-semibold">תמונה או אוואטר</Label>
              <p className="text-xs text-muted-foreground mt-1">אפשר להעלות תמונה אישית או לבחור אוואטר.</p>
            </div>
            <div className="w-16 h-16 rounded-2xl border bg-card flex items-center justify-center overflow-hidden shrink-0">
              {form.image_mode === 'photo' && form.photo_url ? (
                <img src={form.photo_url} alt="תמונת פרופיל" className="w-full h-full object-cover" style={{ objectPosition: 'center 22%' }} />
              ) : (
                <span className="text-3xl" aria-hidden="true">{AVATARS.find(a => a.value === activeAvatar)?.icon}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2" dir="rtl">
            {AVATARS.map(option => {
              const active = form.image_mode === 'avatar' && activeAvatar === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set({ avatar: option.value, image_mode: 'avatar' })}
                  className={`relative flex items-center justify-end gap-2 rounded-xl border px-3 py-2 text-right transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  {active && <CheckCircle2 className="w-4 h-4 absolute start-2 text-primary" />}
                  <span className="text-lg" aria-hidden="true">{option.icon}</span>
                  <span className="text-sm font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end" dir="rtl">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <ImagePlus className="w-4 h-4" />
              {uploading ? 'מעלה תמונה...' : 'העלאת תמונה'}
            </Button>
          </div>
        </div>

        {/* שדות אישיים */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
          <div className="space-y-1.5">
            <Label>שם פרטי</Label>
            <Input value={form.firstName} onChange={e => set({ firstName: e.target.value })} placeholder="שם פרטי" />
          </div>
          <div className="space-y-1.5">
            <Label>שם משפחה</Label>
            <Input value={form.lastName} onChange={e => set({ lastName: e.target.value })} placeholder="שם משפחה" />
          </div>
          <div className="space-y-1.5">
            <Label>טלפון</Label>
            <Input type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="050-0000000" />
          </div>
          <div className="space-y-1.5">
            <Label>כתובת</Label>
            <Input value={form.address} onChange={e => set({ address: e.target.value })} placeholder="רחוב, מספר, עיר" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>מייל</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => set({ email: e.target.value })}
              disabled={emailLocked}
              placeholder="כתובת מייל"
            />
            {emailLocked && <p className="text-xs text-muted-foreground">המייל הוזן על ידי בית הספר ולא ניתן לשינוי. לעדכון — פנו למחנך/ת.</p>}
          </div>
        </div>

        {/* מגדר */}
        <div className="space-y-1.5">
          <Label>מגדר</Label>
          <div className="grid grid-cols-2 gap-2" dir="rtl">
            {['זכר', 'נקבה'].map(value => {
              const active = form.gender === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ gender: value })}
                  className={`relative flex items-center justify-end gap-2 rounded-xl border px-3 py-2 text-right transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  {active && <CheckCircle2 className="w-4 h-4 absolute start-2 text-primary" />}
                  <span className="text-sm">{value}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">האפליקציה תפנה אליך לפי המגדר שנבחר.</p>
        </div>

        <Button type="button" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמירת פרטים'}
        </Button>
      </CardContent>
    </Card>
  );
}