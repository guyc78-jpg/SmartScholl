import { ChevronDown } from 'lucide-react';

const PREVIEW_LIMIT = 14;

export default function ScheduleImportPreview({ rows, diagnostics, showAll, onShowAll }) {
  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_LIMIT);

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <span>שיעורים: <b className="text-foreground">{rows.length}</b></span>
          <span>מקבילים: <b className="text-foreground">{diagnostics?.parallelCount || 0}</b></span>
          <span>כפילויות שדולגו: <b className="text-foreground">{diagnostics?.duplicateCount || 0}</b></span>
          <span>לא פוענחו: <b className="text-foreground">{diagnostics?.unparsedCells?.length || 0}</b></span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-right text-xs" dir="rtl">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-semibold">יום</th>
              <th className="border-b px-3 py-2 font-semibold">שעה</th>
              <th className="border-b px-3 py-2 font-semibold">מקצוע</th>
              <th className="border-b px-3 py-2 font-semibold">מורה</th>
              <th className="border-b px-3 py-2 font-semibold">חדר / הקבצה / הערה</th>
              <th className="border-b px-3 py-2 font-semibold">טקסט מקורי</th>
              <th className="border-b px-3 py-2 font-semibold">שורת מקור</th>
              <th className="border-b px-3 py-2 font-semibold">מקביל</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.day}-${row.period}-${row.source_row}-${index}`} className="border-b align-top last:border-b-0">
                <td className="px-3 py-2 font-medium">{row.day}</td>
                <td className="px-3 py-2">{row.period}</td>
                <td className="px-3 py-2 font-semibold text-foreground">{row.subject}</td>
                <td className="px-3 py-2">{row.teacher}</td>
                <td className="px-3 py-2">{row.room || '—'}</td>
                <td className="max-w-[240px] whitespace-pre-line px-3 py-2 text-muted-foreground">{row.original_text}</td>
                <td className="px-3 py-2">{row.source_row}</td>
                <td className="px-3 py-2">{row.is_parallel ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">כן</span> : 'לא'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {diagnostics?.skippedEmptyRows?.length > 0 && (
        <p className="text-xs text-muted-foreground">שורות ריקות שדולגו: {diagnostics.skippedEmptyRows.join(', ')}</p>
      )}

      {rows.length > PREVIEW_LIMIT && !showAll && (
        <button type="button" onClick={onShowAll} className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-primary hover:underline">
          <ChevronDown className="h-3.5 w-3.5" />
          הצג עוד ({rows.length - PREVIEW_LIMIT} שורות נוספות)
        </button>
      )}
    </div>
  );
}