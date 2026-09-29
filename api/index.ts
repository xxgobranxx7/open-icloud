import app from "../server/_core/app";

export default function handler(req: any, res: any) {
  // Ensure req.url matches what Express expects whether Vercel rewrites it or not
  const matchedPath = req.headers["x-matched-path"];
  const originalUrl = req.originalUrl || req.url;

  if (typeof matchedPath === "string" && matchedPath.includes("/api/")) {
    req.url = matchedPath.substring(matchedPath.indexOf("/api/"));
  } else if (typeof originalUrl === "string" && originalUrl.includes("/api/")) {
    req.url = originalUrl.substring(originalUrl.indexOf("/api/"));
  } else if (typeof req.url === "string" && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return app(req, res);
}
