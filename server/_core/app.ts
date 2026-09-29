import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerWhatsAppProxy, registerWhatsAppSendProxy } from "../whatsappProxy";

export function createExpressApp() {
  const app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerWhatsAppProxy(app);
  registerWhatsAppSendProxy(app);

  // Health check endpoint
  app.get(["/api/health", "/health"], (req, res) => {
    res.json({ ok: true, status: "healthy", timestamp: Date.now() });
  });

  // tRPC API - mounted on both /api/trpc and /trpc
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  });

  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  // Fallback 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.url });
  });

  // Global error handler so requests never hang
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Express Error]:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  });

  return app;
}

export const app = createExpressApp();
export default app;
