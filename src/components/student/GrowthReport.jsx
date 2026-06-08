import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GrowthReport({ studentId, studentName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGrowthData();
  }, [studentId]);

  const fetchGrowthData = async () => {
    setLoading(true);
    setError(null);

    if (!studentId) {
      setData({ indicators: [] });
      setLoading(false);
      return;
    }

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      const response = await Promise.race([
        base44.functions.invoke('calculateStudentGrowth', { student_id: studentId }),
        timeout
      ]);
      setData(response?.data || { indicators: [] });
    } catch (err) {
      setError(null);
      setData({ indicators: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="text-right" dir="rtl">
        <CardContent className="flex items-center justify-start gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>טוען דוח צמיחה...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data?.indicators || data.indicators.length === 0) {
    return (
      <Card className="text-right" dir="rtl">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">דוח צמיחה אישי</span>
          </div>
          <span className="text-xs text-muted-foreground">אין נתונים עדיין</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <Card className="border-primary/20 bg-primary/[0.02] text-right">
        <div className="p-4 space-y-1" dir="rtl">
          <div className="flex items-center gap-2 justify-start">
            <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-semibold leading-none">דוח צמיחה אישי</span>
          </div>
          <p className="text-xs text-muted-foreground">התקדמות אישית לאורך זמן</p>
        </div>
      </Card>

      <div className="grid gap-2">
        {data.indicators.map((indicator, idx) => (
         <Card key={idx} className="border-border/80" dir="rtl">
           <CardContent className="py-4">
             <div className="flex items-start justify-between gap-4" dir="rtl">
               <div className="flex-1 text-right">
                 <h3 className="font-semibold text-foreground mb-1">{indicator.category}</h3>
                 <p className="text-sm text-muted-foreground">{indicator.details}</p>
               </div>
               <div className="flex flex-col items-start gap-1">
                  {/* Main metric */}
                  {indicator.score !== undefined && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {indicator.score}/{indicator.max}
                      </div>
                    </div>
                  )}
                  {indicator.rate !== undefined && (
                    <div className="text-lg font-bold text-primary">{indicator.rate}%</div>
                  )}
                  {indicator.current && !indicator.score && (
                    <div className="text-lg font-bold text-primary">{indicator.current}</div>
                  )}

                  {/* Trend indicator */}
                  {indicator.trend === 'up' && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-semibold" dir="rtl">
                      <TrendingUp className="w-3 h-3" />
                      {indicator.change}
                    </div>
                  )}
                  {indicator.trend === 'down' && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold" dir="rtl">
                      <TrendingDown className="w-3 h-3" />
                      {indicator.change}
                    </div>
                  )}
                  {indicator.trend === 'stable' && (
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold" dir="rtl">
                      <Minus className="w-3 h-3" />
                      יציב
                    </div>
                  )}
               </div>
             </div>

             {/* Progress bar for percentage metrics */}
             {indicator.rate !== undefined && (
               <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                 <div
                   className={cn(
                     'h-full transition-all duration-500',
                     indicator.rate >= 80 ? 'bg-green-500' :
                     indicator.rate >= 60 ? 'bg-blue-500' :
                     indicator.rate >= 40 ? 'bg-amber-500' :
                     'bg-destructive'
                   )}
                   style={{ width: `${indicator.rate}%` }}
                 />
               </div>
             )}
           </CardContent>
         </Card>
        ))}
      </div>

    </div>
  );
}