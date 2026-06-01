import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM_EMAIL = 'StockFlow <onboarding@resend.dev>';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalized = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Confirm a user with this email exists; if not, silently return success (no enumeration)
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const userExists = list?.users?.some((u) => u.email?.toLowerCase() === normalized);

    if (userExists) {
      const code = generateCode();
      const code_hash = await sha256Hex(code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Invalidate any prior un-used codes for this email
      await supabase
        .from('password_reset_codes')
        .update({ used: true })
        .eq('email', normalized)
        .eq('used', false);

      const { error: insertErr } = await supabase
        .from('password_reset_codes')
        .insert({ email: normalized, code_hash, expires_at });

      if (insertErr) throw insertErr;

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) throw new Error('RESEND_API_KEY not configured');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
          <h1 style="font-size:20px;color:#18181b;margin:0 0 8px;">Password Reset Code</h1>
          <p style="font-size:14px;color:#71717a;margin:0 0 24px;">
            Use the code below to reset your StockFlow password. This code expires in 10 minutes.
          </p>
          <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">${code}</span>
          </div>
          <p style="font-size:12px;color:#a1a1aa;margin:0;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [normalized],
          subject: 'Your StockFlow Password Reset Code',
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Resend send failed:', res.status, errText);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Always return success to prevent email enumeration
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-password-reset-otp error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
