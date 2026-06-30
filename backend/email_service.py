"""
Email sending service.

Real-world pattern: generate a signed reset token, store it with an expiry,
email a link containing the token. User clicks it, submits a new password,
backend validates the token before allowing the change.

To go live:
  1. Create a free SendGrid account: https://signup.sendgrid.com
  2. Create an API key: Settings -> API Keys -> Create API Key (Full Access)
  3. Verify a sender identity (Settings -> Sender Authentication) — use the
     email address you want "From" to show, e.g. no-reply@smartattendance.com
     or your own email if you don't have a domain yet.
  4. Set environment variables before running the app:
       SENDGRID_API_KEY=your_key_here
       FROM_EMAIL=no-reply@yourdomain.com
       APP_BASE_URL=https://your-deployed-url.com

Without those env vars set, emails are printed to the server console instead
of actually sending — useful for local development and testing.
"""

import os
import smtplib
from email.mime.text import MIMEText

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
FROM_EMAIL        = os.environ.get("FROM_EMAIL", "no-reply@smartattendance.local")
APP_BASE_URL       = os.environ.get("APP_BASE_URL", "http://localhost:8000")

# Optional Gmail SMTP fallback (set these instead of SendGrid if preferred)
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")


def send_email(to_email: str, subject: str, body_html: str, body_text: str):
    """Send an email via SendGrid, SMTP, or print to console if neither configured."""

    if SENDGRID_API_KEY:
        try:
            import requests
            resp = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": FROM_EMAIL},
                    "subject": subject,
                    "content": [
                        {"type": "text/plain", "value": body_text},
                        {"type": "text/html", "value": body_html},
                    ],
                },
                timeout=10,
            )
            if resp.status_code >= 300:
                print(f"[email] SendGrid error {resp.status_code}: {resp.text}")
            else:
                print(f"[email] Sent via SendGrid to {to_email}")
            return
        except Exception as e:
            print(f"[email] SendGrid send failed: {e}")

    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEText(body_text)
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = to_email
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
            print(f"[email] Sent via SMTP to {to_email}")
            return
        except Exception as e:
            print(f"[email] SMTP send failed: {e}")

    # Fallback — no email service configured, log to console
    print("=" * 60)
    print(f"[email] NOT CONFIGURED — would have sent to {to_email}")
    print(f"Subject: {subject}")
    print(body_text)
    print("=" * 60)


def send_password_reset_email(to_email: str, token: str, role: str):
    reset_link = f"{APP_BASE_URL}/reset-password?token={token}&role={role}"
    subject = "Reset your SmartAttendance password"
    text = (
        f"We received a request to reset your SmartAttendance password.\n\n"
        f"Reset your password using this link (expires in 15 minutes):\n{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email."
    )
    html = (
        f"<p>We received a request to reset your SmartAttendance password.</p>"
        f"<p><a href='{reset_link}'>Click here to reset your password</a> "
        f"(expires in 15 minutes).</p>"
        f"<p>If you did not request this, you can safely ignore this email.</p>"
    )
    send_email(to_email, subject, html, text)
