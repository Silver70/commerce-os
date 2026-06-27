/**
 * Server-only GraphQL transport for the Commerce OS backend.
 *
 * The commerce API key and backend URL live in server env and must never reach
 * the browser, so this module is imported only from TanStack Start server
 * functions (`features/*\/server.ts`). There is deliberately no Apollo/urql in
 * the browser — that would force the API key client-side. Throws on network or
 * GraphQL errors; returns typed `data`.
 */

export interface GqlFetchOptions {
  /** Storefront customer JWT, for customer-scoped operations. */
  customerToken?: string;
  /** Idempotency key for checkout / payment mutations. */
  idempotencyKey?: string;
  /** Optional operation name (aids backend logging). */
  operationName?: string;
}

export class GraphQLRequestError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GraphQLRequestError";
    this.status = status;
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: GqlFetchOptions,
): Promise<T> {
  const apiUrl = process.env.COMMERCE_API_URL;
  const apiKey = process.env.COMMERCE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new GraphQLRequestError(
      "COMMERCE_API_URL and COMMERCE_API_KEY must be set in the server env.",
    );
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
  };
  if (opts?.customerToken) {
    headers.authorization = `Bearer ${opts.customerToken}`;
  }
  if (opts?.idempotencyKey) {
    headers["idempotency-key"] = opts.idempotencyKey;
  }

  const res = await fetch(`${apiUrl}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
      operationName: opts?.operationName,
    }),
  });

  if (!res.ok) {
    throw new GraphQLRequestError(
      `Commerce API responded with ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new GraphQLRequestError(json.errors[0].message);
  }
  if (json.data === undefined || json.data === null) {
    throw new GraphQLRequestError("Commerce API returned no data.");
  }
  return json.data;
}
