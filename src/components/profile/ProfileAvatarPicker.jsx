import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ImagePlus, UserRound } from 'lucide-react';
import { toast } from 'sonner';

const AVATAR_OPTIONS = [
  { value: 'male_teacher', label: 'מורה זכר', icon: '👨‍🏫' },
  { value: 'female_teacher', label: 'מורה נקבה', icon: '👩‍🏫' },
];

export default function ProfileAvatarPicker({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const mode = value.profile_image_mode || (value.profile_photo_url ? 'photo' : 'avatar');
  const selectedAvatar = value.profile_avatar || 'male_teacher';

  const update = (patch) => onChange({ ...value, ...patch });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    update({ profile_photo_url: result.file_url, profile_image_mode: 'photo' });
    toast.success('התמונה הועלתה לפרופיל');
    setUploading(false);
    event.target.value = '';
  };

  return (
    <div className="space-y-3 md:col-span-2 rounded-xl border bg-muted/20 p-3 text-right" dir="rtl">
      <div className="flex items-start justify-between gap-3" dir="rtl">
        <div className="text-right">
          <Label className="text-xs font-semibold">תמונת פרופיל או אוואטר</Label>
          <p className="text-xs text-muted-foreground mt-1">אפשר להעלות תמונה אישית או לבחור אוואטר מורה.</p>
        </div>
        <div className="w-16 h-16 rounded-2xl border bg-card flex items-center justify-center overflow-hidden shrink-0">
          {mode === 'photo' && value.profile_photo_url ? (
            <img
              src={value.profile_photo_url}
              alt="תמונת פרופיל"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 22%' }}
            />
          ) : (
            <span className="text-3xl" aria-hidden="true">
              {AVATAR_OPTIONS.find(item => item.value === selectedAvatar)?.icon || '👨‍🏫'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" dir="rtl">
        {AVATAR_OPTIONS.map(option => {
          const active = mode === 'avatar' && selectedAvatar === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update({ profile_avatar: option.value, profile_image_mode: 'avatar' })}
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


      <div className="flex flex-col sm:flex-row justify-end gap-2" dir="rtl">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="justify-center sm:justify-end">
          <ImagePlus className="w-4 h-4" />
          {uploading ? 'מעלה תמונה...' : 'העלאת תמונה'}
        </Button>
        {value.profile_photo_url && (
          <Button type="button" variant="ghost" onClick={() => update({ profile_image_mode: 'avatar' })} className="justify-center sm:justify-end">
            <UserRound className="w-4 h-4" />
            השתמש/י באוואטר
          </Button>
        )}
      </div>
    </div>
  );
}