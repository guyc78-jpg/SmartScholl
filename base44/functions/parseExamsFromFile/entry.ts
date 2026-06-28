import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Fetch file content
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Detect file type by extension or try to parse
    let text = '';
    
    // Try to extract text from different formats
    try {
      // Try as plain text first
      text = new TextDecoder().decode(uint8Array);
    } catch {
      return Response.json({ error: 'Unable to read file' }, { status: 400 });
    }

    // Parse events from text
    const events = parseExamsFromText(text);

    return Response.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseExamsFromText(text) {
  const events = [];
  const hebrewMonths = {
    'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6,
    'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
  };
  
  const hebrewDays = {
    'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
  };

  // Split lines and process
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentDate = null;
  let currentDay = null;

  for (const line of lines) {
    // Try to detect date patterns
    const dateMatch = line.match(/(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})/);
    if (dateMatch) {
      currentDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }

    // Try to detect Hebrew date pattern (day month year)
    const hebrewDateMatch = line.match(/(\d{1,2})\s*(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)\s*(\d{4})?/i);
    if (hebrewDateMatch) {
      const day = hebrewDateMatch[1].padStart(2, '0');
      const month = hebrewMonths[hebrewDateMatch[2]] || 1;
      const year = hebrewDateMatch[3] || new Date().getFullYear();
      currentDate = `${year}-${String(month).padStart(2, '0')}-${day}`;
    }

    // Detect day of week
    for (const [hebDay, dayNum] of Object.entries(hebrewDays)) {
      if (line.includes(hebDay)) {
        currentDay = hebDay;
        break;
      }
    }

    // Parse time pattern (HH:MM)
    const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
    let time = null;
    if (timeMatch) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }

    // Split multiple events in one cell by common separators
    const eventSeparators = [',', '|', '•', '·', '‒', '–', '—'];
    const eventLines = [];
    let currentEvent = line;
    
    for (const sep of eventSeparators) {
      if (currentEvent.includes(sep)) {
        const parts = currentEvent.split(sep).map(p => p.trim());
        eventLines.push(...parts.filter(p => p.length > 0 && !p.match(/^[\d\-/.]+$/) && !Object.keys(hebrewDays).some(d => p === d)));
        currentEvent = '';
        break;
      }
    }

    const linesToProcess = currentEvent ? [currentEvent] : eventLines;

    for (let eventText of linesToProcess) {
      // Skip if it's just a date or day
      if (eventText.match(/^[\d\-/.]+$/) || Object.values(hebrewDays).includes(eventText)) {
        continue;
      }

      // Try to extract grade/class
      const gradeMatch = eventText.match(/כ?י[א-ת]|י׳\d|י״\d/i);
      let grade = gradeMatch ? gradeMatch[0] : '';

      // Try to detect exam type
      let examType = 'מבחן';
      if (eventText.match(/בחינה|בגרות/i)) examType = 'בגרות';
      else if (eventText.match(/עבודה|מטלה|פרויקט/i)) examType = 'עבודה';
      else if (eventText.match(/משימה/i)) examType = 'משימה';

      // Extract clean exam name (remove time, grade, type indicators)
      let examName = eventText
        .replace(timeMatch ? `${timeMatch[0]}` : '', '')
        .replace(gradeMatch ? gradeMatch[0] : '', '')
        .replace(/מבחן|בגרות|עבודה|בחינה|מטלה|פרויקט|משימה/i, '')
        .trim();

      if (examName.length > 2) {
        const event = {
          id: `temp_${Date.now()}_${Math.random()}`,
          date: currentDate || new Date().toISOString().split('T')[0],
          day: currentDay || '',
          time: time || '',
          title: examName,
          type: examType,
          class_or_grade: grade,
          notes: ''
        };
        events.push(event);
      }
    }
  }

  return events;
}