"""Email tool — requires user approval (dangerous action)."""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from tools import register
from core.logger import get_logger

logger = get_logger("jarvis.tools.email")


@register(
    schema={
        "type": "function",
        "function": {
            "name": "send_email",
            "description": (
                "Send an email. DANGEROUS — requires user approval. "
                "Requires SMTP_HOST, SMTP_USER, SMTP_PASS env vars."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email address"},
                    "subject": {"type": "string", "description": "Email subject"},
                    "body": {"type": "string", "description": "Email body (plain text)"},
                    "from_addr": {
                        "type": "string",
                        "description": "Sender address (defaults to SMTP_USER env var)",
                    },
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
    dangerous=True,
)
async def send_email(
    to: str,
    subject: str,
    body: str,
    from_addr: Optional[str] = None,
) -> str:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_host or not smtp_user or not smtp_pass:
        return (
            "ERROR: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env\n"
            f"Email draft:\nTo: {to}\nSubject: {subject}\n\n{body}"
        )

    sender = from_addr or smtp_user

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(sender, to, msg.as_string())
        logger.info(f"Email sent to {to}: {subject}")
        return f"OK: email sent to {to}"
    except Exception as exc:
        return f"ERROR sending email: {exc}"
