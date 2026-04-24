import secrets

print("Webhook Secret:", secrets.token_urlsafe(32))
