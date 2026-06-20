import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ClassIdentityEditor({ classRoom, canEdit, saving, onSave }) {
  const currentIdentity = String(classRoom?.class_identity || '').trim();
  const [editing, setEditing] = useState(false);
  const [identity, setIdentity] = useState(currentIdentity);

  useEffect(() => {
    setIdentity(currentIdentity);
    setEditing(false);
  }, [currentIdentity, classRoom?.id]);

  const changed = identity.trim() !== currentIdentity;

  if (!canEdit) return null;

  if (!editing) {
    return (
      <div className="flex justify-start text-right" dir="rtl">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          עריכת מגמת כיתה
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-right" dir="rtl">
      <label className="text-sm font-medium text-foreground">מגמת כיתה</label>
      <Input
        value={identity}
        onChange={event => setIdentity(event.target.value)}
        placeholder="לדוגמה: מופ״ת"
        className="text-right"
        dir="rtl"
      />
      <div className="flex justify-start gap-2">
        <Button type="button" size="sm" disabled={!changed || saving} onClick={() => onSave(classRoom, identity.trim())}>
          {saving ? 'שומר...' : 'שמור מגמה'}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => { setIdentity(currentIdentity); setEditing(false); }}>
          ביטול
        </Button>
      </div>
    </div>
  );
}