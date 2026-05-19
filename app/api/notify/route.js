// POST /api/notify
// Sends an email to subscribers when a new article is published.
//
// This route is OPTIONAL. If RESEND_API_KEY (and the Firebase service
// account) are not set, it simply skips sending and returns ok:true so
// the publishing flow is never interrupted.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Resend } from 'resend';

// Lazily create a Firebase Admin Firestore instance from a base64 service account.
async function getAdminDb() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  try {
    const admin = await import('firebase-admin');
    if (!admin.apps || admin.apps.length === 0) {
      const serviceAccount = JSON.parse(
        Buffer.from(b64, 'base64').toString('utf8')
      );
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin.firestore();
  } catch (err) {
    console.error('Firebase Admin init failed:', err);
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { articleTitle, articleId, authorName } = body;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return Response.json({ ok: true, skipped: 'email_not_configured' });
    }

    const adminDb = await getAdminDb();
    if (!adminDb) {
      return Response.json({ ok: true, skipped: 'firebase_admin_not_configured' });
    }

    // Collect subscribers (users who kept email notifications on).
    const snap = await adminDb
      .collection('users')
      .where('emailNotifications', '==', true)
      .get();

    const recipients = snap.docs
      .map((d) => d.data().email)
      .filter((e) => typeof e === 'string' && e.includes('@'));

    if (recipients.length === 0) {
      return Response.json({ ok: true, skipped: 'no_subscribers' });
    }

    const from = process.env.NOTIFY_FROM_EMAIL || 'ARTicles <onboarding@resend.dev>';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const link = appUrl && articleId ? `${appUrl}/dashboard/article/${articleId}` : appUrl;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#0b0a0c;padding:32px;color:#f3eee9">
        <div style="max-width:520px;margin:0 auto;background:#17151b;border:1px solid #322d3a;border-radius:14px;padding:32px">
          <p style="color:#d8b04a;letter-spacing:3px;font-size:12px;margin:0 0 8px">NEW ON ARTICLES</p>
          <h1 style="margin:0 0 12px;font-size:24px;color:#f3eee9">${escapeHtml(articleTitle || 'A new article')}</h1>
          <p style="color:#9b94a3;margin:0 0 24px">
            ${escapeHtml(authorName || 'Someone')} just published something new. Take a look.
          </p>
          ${
            link
              ? `<a href="${link}" style="display:inline-block;background:#e23c3c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold">Read it now</a>`
              : ''
          }
          <p style="color:#6c6577;font-size:12px;margin-top:28px">
            You receive this because email notifications are on in your ARTicles settings.
          </p>
        </div>
      </div>`;

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to: [from],          // primary recipient is the sender; real readers are bcc'd
      bcc: recipients,
      subject: `New on ARTicles: ${articleTitle || 'A new article'}`,
      html,
    });

    return Response.json({ ok: true, sent: recipients.length });
  } catch (err) {
    console.error('Notify route error:', err);
    // Always 200 so the client fire-and-forget call never surfaces an error.
    return Response.json({ ok: false, error: String(err && err.message) });
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
