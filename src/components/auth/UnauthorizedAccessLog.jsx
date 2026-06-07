import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageNotFound from '@/lib/PageNotFound';

export default function UnauthorizedAccessLog() {
  useEffect(() => {
    base44.functions.invoke('authorizeAccess', {
      action: 'logUnauthorizedAccess',
      path: window.location.pathname,
      details: 'ניסיון גישה למסך שאינו מורשה או אינו קיים',
    }).catch(() => {});
  }, []);

  return <PageNotFound />;
}