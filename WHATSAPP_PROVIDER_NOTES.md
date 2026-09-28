# Pluto WA integration notes

Source pages provided by the user/developer:

- Dashboard: https://plutowa.online
- Sessions page: https://plutowa.online/portal/sessions
- API keys page: https://plutowa.online/portal/api-keys
- Live API docs: https://plutowa.online/api/docs
- API Base URL: https://plutowa.online/api

Documented endpoints:

- `GET https://plutowa.online/api/sessions/{sessionId}`
- `POST https://plutowa.online/api/sessions/{sessionId}/messages/send-text`

Authentication:

- `X-API-Key: YOUR_API_KEY`
- `Authorization: Bearer YOUR_API_KEY` is also reportedly supported.

Send-text body:

```json
{
  "chatId": "966501234567@c.us",
  "text": "Hello from Pluto WA"
}
```

Important validation result on 2026-09-24:

- `api.pluto-wa.com` is a documentation placeholder and does not resolve via DNS.
- The user-provided API key was tested against `https://plutowa.online/api/sessions/201555140522` and returned HTTP 401 with `Invalid API key`. The key should be revoked and regenerated.
