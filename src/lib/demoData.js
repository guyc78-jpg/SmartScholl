import { base44 } from '@/api/base44Client';

export const CLASS_ID = 'class-yod-1';

export async function seedDemoData() {
  try {
    // Check if already seeded
    const existing = await base44.entities.ClassRoom.filter({ name: 'י׳1' });
    if (existing.length > 0) return;

    // Create classroom
    await base44.entities.ClassRoom.create({
      name: 'י׳1',
      grade: 'י',
      homeroom_teacher_name: 'מורת הכיתה',
      year: '2024-2025',
      room_number: '201'
    });

    const students = [
      { full_name: 'אלון כהן', gender: 'זכר', phone: '050-1234567', email: 'alon@school.il', parent1_name: 'דוד כהן', parent1_phone: '052-1234567', parent1_email: 'david@email.com', parent2_name: 'שרה כהן', parent2_phone: '054-1234567', community_service_goal: 60, community_service_done: 45, community_service_place: 'בית אבות', community_service_status: 'בתהליך', status: 'פעיל', tags: ['מצטיין'] },
      { full_name: 'נועה לוי', gender: 'נקבה', phone: '050-2345678', email: 'noa@school.il', parent1_name: 'יוסי לוי', parent1_phone: '052-2345678', parent1_email: 'yosi@email.com', parent2_name: 'מיכל לוי', parent2_phone: '054-2345678', community_service_goal: 60, community_service_done: 60, community_service_place: 'ספרייה', community_service_status: 'הושלם', status: 'פעיל', tags: ['מנהיגות'] },
      { full_name: 'יונתן ברק', gender: 'זכר', phone: '050-3456789', email: 'yoni@school.il', parent1_name: 'אמיר ברק', parent1_phone: '052-3456789', parent1_email: 'amir@email.com', community_service_goal: 60, community_service_done: 10, community_service_place: '', community_service_status: 'בתהליך', status: 'דורש מעקב', tags: ['היעדרויות'] },
      { full_name: 'שיר אברהם', gender: 'נקבה', phone: '050-4567890', email: 'shir@school.il', parent1_name: 'רון אברהם', parent1_phone: '052-4567890', parent1_email: 'ron@email.com', community_service_goal: 60, community_service_done: 55, community_service_place: 'גן ילדים', community_service_status: 'בתהליך', status: 'פעיל', tags: [] },
      { full_name: 'עומר גולד', gender: 'זכר', phone: '050-5678901', email: 'omer@school.il', parent1_name: 'ליאת גולד', parent1_phone: '052-5678901', parent1_email: 'liat@email.com', community_service_goal: 60, community_service_done: 30, community_service_place: 'מרכז קהילתי', community_service_status: 'בתהליך', status: 'פעיל', tags: [] },
      { full_name: 'מיה פרץ', gender: 'נקבה', phone: '050-6789012', email: 'mia@school.il', parent1_name: 'אבי פרץ', parent1_phone: '052-6789012', parent1_email: 'avi@email.com', community_service_goal: 60, community_service_done: 0, community_service_place: '', community_service_status: 'לא התחיל', status: 'דורש מעקב', tags: ['משמעת'] },
      { full_name: 'תום שפירא', gender: 'זכר', phone: '050-7890123', email: 'tom@school.il', parent1_name: 'ניר שפירא', parent1_phone: '052-7890123', parent1_email: 'nir@email.com', community_service_goal: 60, community_service_done: 60, community_service_place: 'קופת חולים', community_service_status: 'הושלם', status: 'פעיל', tags: [] },
      { full_name: 'ליאור מזרחי', gender: 'נקבה', phone: '050-8901234', email: 'lior@school.il', parent1_name: 'ורד מזרחי', parent1_phone: '052-8901234', parent1_email: 'vered@email.com', community_service_goal: 60, community_service_done: 20, community_service_place: '', community_service_status: 'בתהליך', status: 'פעיל', tags: [] },
    ];

    const createdStudents = [];
    for (const s of students) {
      const st = await base44.entities.Student.create({ ...s, class_id: CLASS_ID, class_name: 'י׳1', grade: 'י', student_number: `1000${createdStudents.length + 1}` });
      createdStudents.push(st);
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Attendance
    for (const s of createdStudents) {
      const statuses = ['נוכח', 'נוכח', 'נוכח', 'מאחר', 'נוכח', 'נוכח', 'נוכח', 'נעדר'];
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      await base44.entities.AttendanceRecord.create({ student_id: s.id, student_name: s.full_name, class_id: CLASS_ID, date: today, status: st });
      await base44.entities.AttendanceRecord.create({ student_id: s.id, student_name: s.full_name, class_id: CLASS_ID, date: yesterday, status: 'נוכח' });
    }

    // Exams
    const futureDate1 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const futureDate2 = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const futureDate3 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    await base44.entities.Exam.create({ class_id: CLASS_ID, title: 'מבחן מתמטיקה – פונקציות', subject: 'מתמטיקה', type: 'מבחן', date: futureDate1, time: '09:00', teacher: 'גב׳ רבין', material: 'פרקים 5-7', notes: 'מחשבון מורשה' });
    await base44.entities.Exam.create({ class_id: CLASS_ID, title: 'בחן ספרות', subject: 'ספרות', type: 'בחן', date: futureDate2, time: '11:00', teacher: 'מר לוי', material: 'פרק א בספר', notes: '' });
    await base44.entities.Exam.create({ class_id: CLASS_ID, title: 'פרויקט אנגלית', subject: 'אנגלית', type: 'פרויקט', date: futureDate3, time: '08:00', teacher: 'גב׳ גרין', material: 'הגשה דיגיטלית', notes: 'יש לשלוח למייל' });

    // Schedule
    const schedule = [
      { day: 'ראשון', period: 1, start_time: '08:00', end_time: '08:45', subject: 'מתמטיקה', teacher: 'גב׳ רבין', room: '201' },
      { day: 'ראשון', period: 2, start_time: '08:50', end_time: '09:35', subject: 'עברית', teacher: 'מר כהן', room: '201' },
      { day: 'ראשון', period: 3, start_time: '09:40', end_time: '10:25', subject: 'ספרות', teacher: 'מר לוי', room: '201' },
      { day: 'ראשון', period: 4, start_time: '10:40', end_time: '11:25', subject: 'אנגלית', teacher: 'גב׳ גרין', room: '201' },
      { day: 'ראשון', period: 5, start_time: '11:30', end_time: '12:15', subject: 'היסטוריה', teacher: 'גב׳ שמיר', room: '201' },
      { day: 'שני', period: 1, start_time: '08:00', end_time: '08:45', subject: 'פיזיקה', teacher: 'מר ברוך', room: '203' },
      { day: 'שני', period: 2, start_time: '08:50', end_time: '09:35', subject: 'כימיה', teacher: 'גב׳ פלד', room: '204' },
      { day: 'שני', period: 3, start_time: '09:40', end_time: '10:25', subject: 'ביולוגיה', teacher: 'מר דן', room: '205' },
      { day: 'שני', period: 4, start_time: '10:40', end_time: '11:25', subject: 'מתמטיקה', teacher: 'גב׳ רבין', room: '201' },
      { day: 'שלישי', period: 1, start_time: '08:00', end_time: '08:45', subject: 'אנגלית', teacher: 'גב׳ גרין', room: '201' },
      { day: 'שלישי', period: 2, start_time: '08:50', end_time: '09:35', subject: 'גיאוגרפיה', teacher: 'מר מור', room: '201' },
      { day: 'שלישי', period: 3, start_time: '09:40', end_time: '10:25', subject: 'שעת כיתה', teacher: 'מחנך', room: '201' },
      { day: 'רביעי', period: 1, start_time: '08:00', end_time: '08:45', subject: 'היסטוריה', teacher: 'גב׳ שמיר', room: '201' },
      { day: 'רביעי', period: 2, start_time: '08:50', end_time: '09:35', subject: 'ספרות', teacher: 'מר לוי', room: '201' },
      { day: 'רביעי', period: 3, start_time: '09:40', end_time: '10:25', subject: 'חינוך גופני', teacher: 'מר אדם', room: 'חצר' },
      { day: 'חמישי', period: 1, start_time: '08:00', end_time: '08:45', subject: 'מתמטיקה', teacher: 'גב׳ רבין', room: '201' },
      { day: 'חמישי', period: 2, start_time: '08:50', end_time: '09:35', subject: 'עברית', teacher: 'מר כהן', room: '201' },
      { day: 'חמישי', period: 3, start_time: '09:40', end_time: '10:25', subject: 'אמנות', teacher: 'גב׳ רוזן', room: '210' },
    ];
    for (const slot of schedule) {
      await base44.entities.ScheduleSlot.create({ ...slot, class_id: CLASS_ID });
    }

    // Discipline Events
    await base44.entities.DisciplineEvent.create({ student_id: createdStudents[2].id, student_name: createdStudents[2].full_name, class_id: CLASS_ID, date: yesterday, time: '10:00', severity: 'בינונית', category: 'התנהגות', description: 'שיחה בשעת שיעור', treatment: 'שיחה פרטית', parents_updated: false, status: 'פתוח' });
    await base44.entities.DisciplineEvent.create({ student_id: createdStudents[5].id, student_name: createdStudents[5].full_name, class_id: CLASS_ID, date: yesterday, time: '11:30', severity: 'קלה', category: 'נוכחות', description: 'איחור לשיעור', treatment: 'התראה', parents_updated: false, status: 'בטיפול' });

    // Tasks
    await base44.entities.Task.create({ class_id: CLASS_ID, student_id: createdStudents[2].id, student_name: createdStudents[2].full_name, title: 'שיחה עם הורי יונתן', description: 'לעדכן על היעדרויות חוזרות', due_date: futureDate1, priority: 'גבוהה', status: 'לביצוע', category: 'הורים' });
    await base44.entities.Task.create({ class_id: CLASS_ID, student_id: createdStudents[5].id, student_name: createdStudents[5].full_name, title: 'מעקב אחר מיה פרץ', description: 'בדיקת מעורבות חברתית', due_date: futureDate2, priority: 'בינונית', status: 'לביצוע', category: 'תפקוד' });
    await base44.entities.Task.create({ class_id: CLASS_ID, title: 'הכנת דוח רבעוני', description: 'הכנת ציוני תפקוד לסיום הרבעון', due_date: futureDate3, priority: 'גבוהה', status: 'לביצוע', category: 'כללי' });

    // Announcements
    await base44.entities.Announcement.create({ class_id: CLASS_ID, title: 'מבחן מתמטיקה בקרוב!', content: 'תזכורת: מבחן מתמטיקה ביום שלישי. חומר: פרקים 5-7. יש להתכונן!', type: 'חשובה', requires_confirmation: true, published_at: today, is_published: true });
    await base44.entities.Announcement.create({ class_id: CLASS_ID, title: 'טיול שנתי', content: 'טיול שנתי יתקיים בחודש הבא. יש להגיש טופס הסכמת הורים עד לסוף השבוע.', type: 'כיתתית', requires_confirmation: false, published_at: yesterday, is_published: true });
    await base44.entities.Announcement.create({ class_id: CLASS_ID, title: 'שינוי בלוח שיעורים', content: 'ביום חמישי הקרוב שיעור חינוך גופני מועבר לשעה 12:00', type: 'כיתתית', requires_confirmation: false, published_at: today, is_published: true });

    // Communications
    await base44.entities.Communication.create({ student_id: createdStudents[2].id, student_name: createdStudents[2].full_name, class_id: CLASS_ID, date: yesterday, type: 'שיחה טלפונית', with_whom: 'הורה 1', summary: 'שיחה על היעדרויות – ההורה מודע לבעיה, יש בעיה רפואית', follow_up: 'לבדוק שוב בעוד שבועיים' });

    // Teacher Notes
    await base44.entities.TeacherNote.create({ student_id: createdStudents[0].id, student_name: createdStudents[0].full_name, class_id: CLASS_ID, date: yesterday, content: 'אלון מראה שיפור ניכר בהשתתפות בשיעורים. יש לעודד את הצטרפותו לתפקיד מנהיגות.', category: 'אקדמי', is_private: true });
    await base44.entities.TeacherNote.create({ student_id: createdStudents[2].id, student_name: createdStudents[2].full_name, class_id: CLASS_ID, date: today, content: 'יונתן נראה עייף ומנותק. כדאי לשוחח עמו בנפרד ולברר אם יש קשיים בבית.', category: 'רגשי', is_private: true });

    // Performance Reviews
    await base44.entities.PerformanceReview.create({ student_id: createdStudents[0].id, student_name: createdStudents[0].full_name, class_id: CLASS_ID, period: 'רבעון א׳', date: yesterday, learning_habits: 4, participation: 5, responsibility: 4, behavior: 5, social_functioning: 4, emotional_state: 4, notes: 'תלמיד מצטיין עם מנהיגות טבעית' });
    await base44.entities.PerformanceReview.create({ student_id: createdStudents[2].id, student_name: createdStudents[2].full_name, class_id: CLASS_ID, period: 'רבעון א׳', date: yesterday, learning_habits: 2, participation: 2, responsibility: 3, behavior: 3, social_functioning: 3, emotional_state: 2, notes: 'דורש מעקב צמוד' });

  } catch (e) {
    console.error('Error seeding demo data:', e);
  }
}