import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const publicKey = (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim().replace(/^['\"]|['\"]$/g, '').replace(/\s/g, '');
    if (!publicKey) return Response.json({ error: 'Push notifications are not configured' }, { status: 500 });

    const normalized = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const decoded = atob(padded);
    if (decoded.length !== 65) return Response.json({ error: 'Invalid VAPID public key' }, { status: 500 });

    return Response.json({ publicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
