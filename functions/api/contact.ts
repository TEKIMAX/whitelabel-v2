export async function onRequestPost({ request, env }) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { RESEND_API_KEY, ADMIN_EMAIL } = env;

    if (!RESEND_API_KEY || !ADMIN_EMAIL) {
      console.error('Missing RESEND_API_KEY or ADMIN_EMAIL in environment');
      return new Response(JSON.stringify({ error: 'Email service misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  </head>
  <body style="background-color:#f6f9fc;margin:0;padding:0;">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px 0;">
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="max-width:600px;background-color:#ffffff;margin:0 auto;padding:20px 0 48px;border-radius:5px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:0 48px;">
                      <tbody>
                        <tr>
                          <td>
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;">
                              <tr>
                                <td style="vertical-align:middle;padding-right:10px;">
                                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#292524,#1c1917);text-align:center;line-height:36px;">
                                    <span style="color:#C5A065;font-size:14px;font-weight:bold;">AS</span>
                                  </div>
                                </td>
                                <td style="vertical-align:middle;">
                                  <span style="font-size:18px;font-weight:700;color:#1c1917;letter-spacing:-0.5px;">Adaptive Startup</span>
                                </td>
                              </tr>
                            </table>
                            <hr style="width:100%;border:none;border-top:1px solid #e6ebf1;margin:20px 0;" />
                            <p style="font-size:20px;line-height:28px;color:#1c1917;font-weight:700;margin:16px 0 8px;">
                              New Contact Message
                            </p>
                            <p style="font-size:16px;line-height:24px;color:#525f7f;margin:0 0 24px;">
                              <strong>${escapedName}</strong> (${escapedEmail}) sent a message via the landing page.
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:24px;">
                              <tr>
                                <td style="padding:16px 20px;background-color:#f8f9fa;border-left:4px solid #C5A065;border-radius:0 4px 4px 0;">
                                  <p style="font-size:12px;line-height:16px;color:#8898aa;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                                    Message
                                  </p>
                                  <p style="font-size:15px;line-height:22px;color:#3c4257;margin:0;">
                                    ${escapedMessage}
                                  </p>
                                </td>
                              </tr>
                            </table>
                            <hr style="width:100%;border:none;border-top:1px solid #e6ebf1;margin:20px 0;" />
                            <p style="font-size:12px;line-height:16px;color:#8898aa;margin:0;">
                              Adaptive Startup · Contact Form · Powered by Resend
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${name} via Adaptive Startup <noreply@tekimax.ai>`,
        to: ADMIN_EMAIL,
        reply_to: email,
        subject: `Contact: ${name} — Adaptive Startup`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error('Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
