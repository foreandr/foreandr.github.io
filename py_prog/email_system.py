import imaplib
import email
from email.header import decode_header

EMAIL = "foreandr@gmail.com"
APP_PASSWORD = "vrpnvsgrlgmcqhvu"

mail = imaplib.IMAP4_SSL("imap.gmail.com")
mail.login(EMAIL, APP_PASSWORD)

# select the inbox
mail.select("inbox")

# 🔍 search for emails from YouTube
# this will match addresses like "noreply@youtube.com"
status, data = mail.search(None, '(FROM "youtube.com")')

if status != "OK" or not data[0]:
    print("❌ No messages found from YouTube.")
    mail.logout()
    exit()

ids = data[0].split()
latest_id = ids[-1]  # last = most recent

status, msg_data = mail.fetch(latest_id, "(RFC822)")
raw_email = msg_data[0][1]
msg = email.message_from_bytes(raw_email)

# decode the subject safely
subject, encoding = decode_header(msg["Subject"])[0]
if isinstance(subject, bytes):
    subject = subject.decode(encoding or "utf-8", errors="ignore")

print("From:", msg.get("From"))
print("Subject:", subject)
print("Body preview:\n")

body_text = None

if msg.is_multipart():
    for part in msg.walk():
        ctype = part.get_content_type()
        disp = str(part.get("Content-Disposition"))

        if ctype == "text/plain" and "attachment" not in disp:
            body_text = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            break
        elif ctype == "text/html" and "attachment" not in disp:
            body_text = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            break
else:
    body_text = msg.get_payload(decode=True).decode("utf-8", errors="ignore")

if body_text:
    # just print a small preview
    print(body_text[:500])
else:
    print("(no text body found)")

mail.logout()
