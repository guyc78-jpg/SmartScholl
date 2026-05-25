import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import ClassRoomForm from '@/components/classes/ClassRoomForm';
import ClassRoomCard from '@/components/classes/ClassRoomCard';
import { Plus, School } from 'lucide-react';
import { toast } from 'sonner';

export default function Classrooms() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadClasses() {
    setLoading(true);
    const data = await base44.entities.ClassRoom.list('grade', 500);
    const gradeOrder = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
    const extractNum = (name = '') => {
      const match = String(name).match(/(\d+)\s*$/);
      return match ? parseInt(match[1], 10) : 9999;
    };
    const sorted = data.filter(item => item.is_active !== false).sort((a, b) => {
      const gradeDiff = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
      if (gradeDiff !== 0) return gradeDiff;
      return extractNum(a.name) - extractNum(b.name);
    });
    setClasses(sorted);
    setLoading(false);
  }

  useEffect(() => { loadClasses(); }, []);

  async function handleSave(data) {
    setSaving(true);
    if (editing?.id) await base44.entities.ClassRoom.update(editing.id, data);
    else await base44.entities.ClassRoom.create({ ...data, is_active: true });
    toast.success('הכיתה נשמרה');
    setEditing(null);
    setShowForm(false);
    setSaving(false);
    loadClasses();
  }

  async function handleDelete(classRoom) {
    if (!window.confirm(`למחוק את ${classRoom.name}?`)) return;
    await base44.entities.ClassRoom.update(classRoom.id, { is_active: false });
    toast.success('הכיתה הוסרה מהרשימה');
    loadClasses();
  }

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <PageHeader
        title="ניהול כיתות"
        subtitle="הגדרת שכבה, כיתה, מחנך/ת, רכז/ת וקוד כיתה לבחירת תלמידים"
        actions={<Button size="sm" className="gap-2" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" />כיתה חדשה</Button>}
      />

      {showForm && <ClassRoomForm classRoom={editing} onSubmit={handleSave} onCancel={() => { setEditing(null); setShowForm(false); }} saving={saving} />}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : classes.length === 0 ? (
        <EmptyState icon={School} title="אין כיתות מוגדרות" description="יש להגדיר כיתות לפני שתלמידים יוכלו לבחור כיתה בהרשמה." action={<Button onClick={() => setShowForm(true)}>הוסף כיתה</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map(item => <ClassRoomCard key={item.id} classRoom={item} onEdit={(classRoom) => { setEditing(classRoom); setShowForm(true); }} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}