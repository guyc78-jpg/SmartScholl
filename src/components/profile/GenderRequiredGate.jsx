import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { GENDER_OPTIONS } from '@/lib/roleUtils';

/**
 * חוסם המשך שימוש עד שהמשתמש בוחר לשון פנייה (זכר/נקבה).
 * שדה חובה ראשוני שמשפיע על ניסוחים בכל האפליקציה.
 */
export default function GenderRequiredGate({ user, onSaved }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) {
      toast.error('יש לבחור לשון פנייה');
      return;
    }
    setSaving(true);
    const updated = await base44.auth.updateMe({ profile_gender: selected });
    toast.success('לשון הפנייה נשמרה');
    onSaved?.(updated || { profile_gender: selected });
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <UserRound className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl">בחירת לשון פנייה</CardTitle>
          <CardDescription>
            כדי להמשיך, בחר/י לשון פנייה. הבחירה משפיעה רק על ניסוחי תפקיד והצגה במערכת (לא על הרשאות).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-right block">לשון פנייה</Label>
            <div className="grid grid-cols-2 gap-3">
              {GENDER_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    selected === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground/80 hover:border-primary/40'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !selected} className="w-full">
            {saving ? 'שומר...' : 'המשך'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}