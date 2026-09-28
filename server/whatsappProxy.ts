import type { Express } from "express";

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}



async function resolveReadySessionId(apiUrl: string, apiToken: string, signal: AbortSignal) {
  const base = new URL(apiUrl);
  const apiPath = base.pathname.replace(/\/$/, "");
  const response = await fetch(`${base.origin}${apiPath}/sessions`, {
    method: "GET",
    headers: { "X-API-Key": apiToken, Authorization: `Bearer ${apiToken}`, Accept: "application/json" },
    signal,
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(`SESSION_LIST_${response.status}`);
  const sessions = Array.isArray(payload) ? payload : (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : []);
  const ready = sessions.find(item => {
    if (!item || typeof item !== "object") return false;
    const status = String((item as { status?: unknown }).status ?? "").toLowerCase();
    return status === "ready" || status === "connected";
  }) ?? sessions[0];
  const id = ready && typeof ready === "object" ? String((ready as { id?: unknown }).id ?? "") : "";
  if (!id) throw new Error("NO_READY_SESSION");
  return id;
}

export function registerWhatsAppProxy(app: Express) {
  app.post("/api/whatsapp/test", async (req, res) => {
    const apiUrl = typeof req.body?.apiUrl === "string" ? req.body.apiUrl.trim() : "";
    const apiToken = typeof req.body?.apiToken === "string" ? req.body.apiToken.trim() : "";
    const phoneNumberId = typeof req.body?.phoneNumberId === "string" ? req.body.phoneNumberId.trim() : "";

    if (!apiUrl || !apiToken) {
      return res.status(400).json({ ok: false, message: "apiUrl وAPI Key مطلوبة" });
    }
    if (!isValidHttpUrl(apiUrl)) {
      return res.status(400).json({ ok: false, message: "رابط API غير صحيح" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const parsedUrl = new URL(apiUrl);
    const isPlutoWa = ["plutowa.online", "www.plutowa.online", "api.pluto-wa.com"].includes(parsedUrl.hostname);
    const apiPath = parsedUrl.pathname.replace(/\/$/, "");
    let targetUrl = apiUrl;

    try {
      const sessionId = phoneNumberId || await resolveReadySessionId(apiUrl, apiToken, controller.signal);
      targetUrl = isPlutoWa
        ? `${parsedUrl.origin}${apiPath}/sessions/${encodeURIComponent(sessionId)}`
        : apiUrl;
      const upstream = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "X-API-Key": apiToken,
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
          "User-Agent": "iCloud-Desk-WhatsApp-Proxy/1.0",
          "X-Phone-Number-ID": phoneNumberId,
        },
        signal: controller.signal,
      });
      const body = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "";
      let detail = body.slice(0, 500);
      if (contentType.includes("application/json")) {
        try { detail = JSON.stringify(JSON.parse(body)).slice(0, 500); } catch { /* keep raw body */ }
      }
      const isHtmlPage = contentType.includes("text/html");
      const isApiResponse = upstream.ok && !isHtmlPage;
      return res.status(200).json({
        ok: isApiResponse,
        status: upstream.status,
        message: isHtmlPage
          ? "الرابط يعيد صفحة موقع HTML وليس API. استخدم Base URL الخاص بـ Pluto WA."
          : upstream.status === 401 || upstream.status === 403
            ? "تم الوصول إلى Pluto WA لكن API Key غير صحيح أو لا توجد جلسة متصلة."
            : upstream.ok ? "تم الاتصال بـ Pluto WA بنجاح" : `المزود أعاد HTTP ${upstream.status}`,
        detail,
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "";
      const targetHost = (() => { try { return new URL(targetUrl).hostname; } catch { return targetUrl; } })();
      const message = error instanceof Error && error.name === "AbortError"
        ? `انتهت مهلة الاتصال بـ ${targetHost}`
        : /ENOTFOUND|EAI_AGAIN|Could not resolve host|fetch failed/i.test(errorText)
          ? `تعذر الوصول إلى ${targetHost} من الخادم. تحقق من أن رابط API فعّال ومتاح من مزود الخدمة.`
          : `تعذر الوصول إلى رابط مزود WhatsApp (${targetHost}) من الخادم`;
      return res.status(502).json({ ok: false, message });
    } finally {
      clearTimeout(timeout);
    }
  });
}


export function registerWhatsAppSendProxy(app: Express) {
  app.post("/api/whatsapp/send-test", async (req, res) => {
    const apiUrl = typeof req.body?.apiUrl === "string" ? req.body.apiUrl.trim() : "https://api.pluto-wa.com";
    const apiToken = typeof req.body?.apiToken === "string" ? req.body.apiToken.trim() : "";
    const sessionIdInput = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
    const message = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!apiToken || !to || !message) {
      return res.status(400).json({ ok: false, message: "API Key ورقم المستلم ونص الرسالة مطلوبة" });
    }
    if (!isValidHttpUrl(apiUrl)) {
      return res.status(400).json({ ok: false, message: "رابط API غير صحيح" });
    }

    const base = new URL(apiUrl);
    const apiPath = base.pathname.replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const sessionId = sessionIdInput || await resolveReadySessionId(apiUrl, apiToken, controller.signal);
      const endpoint = `${base.origin}${apiPath}/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-API-Key": apiToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ chatId: to.includes("@c.us") ? to : `${to}@c.us`, text: message }),
        signal: controller.signal,
      });
      const responseText = await upstream.text();
      let data: unknown = responseText;
      try { data = JSON.parse(responseText); } catch { /* keep text */ }
      return res.status(200).json({ ok: upstream.ok, status: upstream.status, data, message: upstream.ok ? "تم إرسال الرسالة التجريبية" : `فشل إرسال الرسالة (HTTP ${upstream.status})` });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "";
      const messageText = errorText === "NO_READY_SESSION"
        ? "لم توجد جلسة WhatsApp جاهزة لإرسال الرسالة."
        : /SESSION_LIST_(401|403)/.test(errorText)
          ? "API Key غير صالح أو لا يملك صلاحية قراءة الجلسات."
          : /ENOTFOUND|EAI_AGAIN|Could not resolve host|fetch failed/i.test(errorText)
            ? "تعذر الوصول إلى Pluto WA API من الخادم."
            : "تعذر الوصول إلى Pluto WA لإرسال الرسالة";
      return res.status(502).json({ ok: false, message: messageText });
    } finally {
      clearTimeout(timeout);
    }
  });
}
