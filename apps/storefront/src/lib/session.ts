/**
 * Server-only cookie/session helpers.
 *
 * The cart id and the customer's JWTs live in httpOnly, Secure, SameSite=Lax
 * cookies set by server functions — never in localStorage, never JS-readable,
 * never in URLs or query keys. A client therefore cannot operate on someone
 * else's cart: every cart server fn derives the cart id from the cookie.
 */
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { gqlFetch } from "./gql-client";

const CART_COOKIE = "cartId";
const CUSTOMER_ACCESS_COOKIE = "customerAccessToken";
const CUSTOMER_REFRESH_COOKIE = "customerRefreshToken";

const ONE_HOUR = 60 * 60;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const CREATE_CART_MUTATION = /* GraphQL */ `
  mutation CreateCart {
    createCart {
      id
    }
  }
`;

// ─── Cart ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current cart id from the httpOnly cookie, creating a fresh cart
 * (and setting the cookie) when none exists. Every cart server fn calls this so
 * the cart id is always server-derived and never trusted from the client.
 */
export async function getOrCreateCartId(): Promise<string> {
  const existing = getCookie(CART_COOKIE);
  if (existing) return existing;

  const { createCart } = await gqlFetch<{ createCart: { id: string } }>(
    CREATE_CART_MUTATION,
  );
  setCookie(CART_COOKIE, createCart.id, {
    ...baseCookieOptions,
    maxAge: THIRTY_DAYS,
  });
  return createCart.id;
}

/** Read the current cart id without creating one (undefined when absent). */
export function getCartId(): string | undefined {
  return getCookie(CART_COOKIE);
}

/** Forget the current cart (e.g. after a successful checkout). */
export function clearCartId(): void {
  deleteCookie(CART_COOKIE, baseCookieOptions);
}

// ─── Customer session (Account feature — optional v1) ───────────────────────

export function getCustomerToken(): string | undefined {
  return getCookie(CUSTOMER_ACCESS_COOKIE);
}

export function getCustomerRefreshToken(): string | undefined {
  return getCookie(CUSTOMER_REFRESH_COOKIE);
}

export function setCustomerSession(tokens: {
  accessToken: string;
  refreshToken: string;
}): void {
  setCookie(CUSTOMER_ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: ONE_HOUR,
  });
  setCookie(CUSTOMER_REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: THIRTY_DAYS,
  });
}

export function clearCustomerSession(): void {
  deleteCookie(CUSTOMER_ACCESS_COOKIE, baseCookieOptions);
  deleteCookie(CUSTOMER_REFRESH_COOKIE, baseCookieOptions);
}
