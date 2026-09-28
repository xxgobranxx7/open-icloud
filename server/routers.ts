import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getAppSetting, upsertAppSetting } from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),


  workspace: router({
    get: publicProcedure.query(async () => {
      const stored = await getAppSetting("workspace_data");
      if (!stored) return { orders: [], customers: [], savedModels: [] };
      try {
        const value = JSON.parse(stored.settingValue);
        return { orders: Array.isArray(value.orders) ? value.orders : [], customers: Array.isArray(value.customers) ? value.customers : [], savedModels: Array.isArray(value.savedModels) ? value.savedModels : [] };
      } catch {
        return { orders: [], customers: [], savedModels: [] };
      }
    }),
    save: publicProcedure
      .input(z.object({ orders: z.array(z.any()), customers: z.array(z.any()), savedModels: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        await upsertAppSetting("workspace_data", JSON.stringify(input));
        return { success: true as const };
      }),
  }),

  settings: router({
    getWhatsApp: publicProcedure.query(async () => {
      const [config, templates] = await Promise.all([getAppSetting("whatsapp_config"), getAppSetting("whatsapp_templates")]);
      let configValue: { apiToken?: string } = {};
      let templatesValue: Record<string, string> = {};
      try { configValue = config ? JSON.parse(config.settingValue) : {}; } catch { /* ignore invalid legacy value */ }
      try { templatesValue = templates ? JSON.parse(templates.settingValue) : {}; } catch { /* ignore invalid legacy value */ }
      return { apiToken: configValue.apiToken || "", templates: templatesValue };
    }),
    saveWhatsApp: publicProcedure
      .input(z.object({ apiToken: z.string().max(512), templates: z.record(z.string(), z.string().max(10000)) }))
      .mutation(async ({ input }) => {
        await Promise.all([
          upsertAppSetting("whatsapp_config", JSON.stringify({ apiToken: input.apiToken })),
          upsertAppSetting("whatsapp_templates", JSON.stringify(input.templates)),
        ]);
        return { success: true as const };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
