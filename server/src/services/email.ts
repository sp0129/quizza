import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Quizza <noreply@quizza.app>';

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const deepLink = `quizza://verify?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your Quizza account',
    html: verificationTemplate(deepLink),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const deepLink = `quizza://reset?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Quizza password',
    html: resetTemplate(deepLink),
  });
}

export async function sendPasswordResetConfirmation(to: string): Promise<void> {
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Quizza password was reset',
    html: confirmationTemplate(timestamp),
  });
}

// ─── HTML Templates ──────────────────────────────────────────────────

function wrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#1E293B;border-radius:16px;border:1px solid #475569;padding:32px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:36px;">🍕</span>
          <h1 style="color:#F1F5F9;font-size:22px;margin:8px 0 0;">Quizza</h1>
        </td></tr>
        ${content}
        <tr><td align="center" style="padding-top:24px;border-top:1px solid #475569;">
          <p style="color:#94A3B8;font-size:12px;margin:0;">Quizza Trivia &mdash; Quiz your friends!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function verificationTemplate(deepLink: string): string {
  return wrapper(`
    <tr><td align="center">
      <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 8px;">Verify your email</h2>
      <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 24px;">
        Tap the button below to verify your email address and start playing.
      </p>
      <a href="${deepLink}" style="display:inline-block;background:#22C55E;color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Verify Email
      </a>
      <p style="color:#94A3B8;font-size:12px;margin:16px 0 0;">
        Or paste this link: <span style="color:#F1F5F9;word-break:break-all;">${deepLink}</span>
      </p>
      <p style="color:#94A3B8;font-size:12px;margin:12px 0 0;">This link expires in 24 hours.</p>
      <p style="color:#94A3B8;font-size:12px;margin:4px 0 0;">If you didn't create this account, you can safely ignore this email.</p>
    </td></tr>
  `);
}

function resetTemplate(deepLink: string): string {
  return wrapper(`
    <tr><td align="center">
      <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 24px;">
        Someone requested a password reset for your Quizza account. Tap the button below to choose a new password.
      </p>
      <a href="${deepLink}" style="display:inline-block;background:#22C55E;color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#94A3B8;font-size:12px;margin:16px 0 0;">
        Or paste this link: <span style="color:#F1F5F9;word-break:break-all;">${deepLink}</span>
      </p>
      <p style="color:#94A3B8;font-size:12px;margin:12px 0 0;">This link expires in 2 hours.</p>
      <p style="color:#94A3B8;font-size:12px;margin:4px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
  `);
}

function confirmationTemplate(timestamp: string): string {
  return wrapper(`
    <tr><td align="center">
      <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 8px;">Password reset successfully</h2>
      <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 8px;">
        Your Quizza password was changed on <strong style="color:#F1F5F9;">${timestamp}</strong>.
      </p>
      <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 8px;">
        You can now log in with your new password.
      </p>
      <p style="color:#EF4444;font-size:13px;margin:16px 0 0;">
        If you didn't make this change, please secure your account immediately by resetting your password again.
      </p>
    </td></tr>
  `);
}
