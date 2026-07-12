import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getStudentClassId, getStudentClassName } from '@/lib/studentProfile';
import { fetchMyStudent } from '@/lib/studentData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import StudentCommunityService from '@/components/student/StudentCommunityService';
import LearningAccommodationsCard from '@/components/student/LearningAccommodationsCard';
import StudentProfileEditCard from '@/components/student/StudentProfileEditCard';
import ClassChangeRequestCard from '@/components/profile/ClassChangeRequestCard';
import { getUserDisplayName } from '@/lib/roleUtils';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function StudentMore({ user }) {
  const { logout } = useAuth();
  const classId = getStudentClassId(user, '');
  const className = getStudentClassName(user);
  const [data, setData] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const student = await fetchMyStudent(user, classId);
    const communityReports = student
      ? await base44.entities.CommunityServiceReport.filter({ student_id: student.id })
      : [];
    setData({
      student,
      communityReports: communityReports.sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || '')),
    });
  }

  if (!data) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 text-right max-w-3xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-foreground">הפרופיל שלי</h1>

      {/* כרטיס פרופיל */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3" dir="rtl">
            <ProfileAvatar user={user} fallback={getUserDisplayName(user)?.charAt(0) || '?'} className="w-14 h-14 text-xl flex-shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="font-bold text-base truncate">{getUserDisplayName(user)}</p>
              <p className="text-sm text-muted-foreground truncate">{className ? `כיתה ${className} · ` : ''}תלמיד/ה</p>
              <p className="text-xs text-muted-foreground truncate force-ltr">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* עריכת פרטים אישיים */}
      {data.student && (
        <StudentProfileEditCard student={data.student} user={user} onSaved={loadData} />
      )}

      {/* בקשת שינוי כיתה — באישור מחנך/ת בלבד */}
      {data.student && (
        <ClassChangeRequestCard user={user} displayName={getUserDisplayName(user)} />
      )}

      {/* מעורבות חברתית — התקדמות ודיווח */}
      {data.student && (
        <StudentCommunityService student={data.student} user={user} reports={data.communityReports} onChanged={loadData} />
      )}

      {/* התאמות למידה */}
      {data.student && (
        <LearningAccommodationsCard studentId={data.student.id} studentName={data.student.full_name} readOnly />
      )}

      {!data.student && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">לא נמצאה רשומת תלמיד/ה מקושרת לחשבון. פנו למחנך/ת הכיתה.</CardContent></Card>
      )}

      <Button variant="outline" className="w-full gap-2" onClick={() => logout(false)}>
        <LogOut className="w-4 h-4" />התנתקות
      </Button>
    </div>
  );
}
