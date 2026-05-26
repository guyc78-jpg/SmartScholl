import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">טוען דוח צמיחה...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.02]" dir="rtl">
        <CardHeader>
          <CardTitle className="flex flex-row-reverse items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            דוח צמיחה אישי
          </CardTitle>
          <CardDescription dir="rtl" className="text-right">
            התקדמות אישית לאורך זמן - ללא השוואה לאחרים
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {data?.indicators?.map((indicator, idx) => (
         <Card key={idx} className="border-border/80" dir="rtl">
           <CardContent className="py-4">
             <div className="flex flex-row-reverse items-start justify-between gap-4">
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
                    <div className="flex flex-row-reverse items-center gap-1 text-green-600 text-xs font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      {indicator.change}
                    </div>
                  )}
                  {indicator.trend === 'down' && (
                    <div className="flex flex-row-reverse items-center gap-1 text-amber-600 text-xs font-semibold">
                      <TrendingDown className="w-3 h-3" />
                      {indicator.change}
                    </div>
                  )}
                  {indicator.trend === 'stable' && (
                    <div className="flex flex-row-reverse items-center gap-1 text-slate-500 text-xs font-semibold">
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

      {(!data?.indicators || data.indicators.length === 0) && (
       <Card className="bg-muted/30" dir="rtl">
         <CardContent className="py-8 text-center">
           <p className="text-sm text-muted-foreground">אין נתוני צמיחה עדיין</p>
         </CardContent>
       </Card>
      )}
    </div>
  );
}