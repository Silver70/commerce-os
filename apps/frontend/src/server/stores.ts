import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { adminStoreHeader } from "~/lib/active-store";
import { apiClient } from "~/lib/api-client";
import { getErrorMessage } from "~/lib/errors";
import type { Store } from "~/types/api";

function incomingCookie(): string {
  return getRequestHeader("cookie") ?? "";
}

const ONBOARDING_COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60,
};

// ─── List Stores ──────────────────────────────────────────────────────────────

export const getStoresServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Store[]> => {
    try {
      const res = await apiClient.get<Store[]>("/api/admin/stores", {
        headers: { cookie: incomingCookie() },
      });
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
);

// ─── Create Store ─────────────────────────────────────────────────────────────

export const createStoreServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(2, "Store name must be at least 2 characters"),
      currency: z.string().length(3, "Currency must be a 3-letter code"),
      timezone: z.string().min(1, "Timezone is required"),
    }),
  )
  .handler(async ({ data }): Promise<Store> => {
    try {
      const res = await apiClient.post<Store>("/api/admin/stores", data, {
        headers: { cookie: incomingCookie() },
      });
      setCookie("wos-active-store", res.data.id, ONBOARDING_COOKIE_OPTS);
      setCookie("wos-onboarding-step", "2", ONBOARDING_COOKIE_OPTS);
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Update Store ─────────────────────────────────────────────────────────────

export const updateStoreServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      storeId: z.string().min(1),
      name: z.string().min(2, "Store name must be at least 2 characters"),
      currency: z.string().length(3, "Currency must be a 3-letter code"),
      timezone: z.string().min(1, "Timezone is required"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { storeId, ...body } = data;
      const res = await apiClient.patch<Store>(
        `/api/admin/stores/${storeId}`,
        body,
        {
          headers: {
            cookie: incomingCookie(),
            ...adminStoreHeader(),
          },
        },
      );
      return res.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  });

// ─── Set Active Store ─────────────────────────────────────────────────────────

export const setActiveStoreServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ storeId: z.string().min(1) }))
  .handler(async ({ data }) => {
    setCookie("wos-active-store", data.storeId, {
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

// ─── Onboarding Step Cookie ───────────────────────────────────────────────────

export const getOnboardingStepServerFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<string | null> => {
  const step = getCookie("wos-onboarding-step");
  if (!step || !["1", "2", "3"].includes(step)) return null;
  return step;
});

export const setOnboardingStepServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ step: z.enum(["2", "3"]) }))
  .handler(async ({ data }) => {
    setCookie("wos-onboarding-step", data.step, ONBOARDING_COOKIE_OPTS);
  });

export const clearOnboardingCookieServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  setCookie("wos-onboarding-step", "", { path: "/", maxAge: 0 });
});
