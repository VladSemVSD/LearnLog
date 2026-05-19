import "server-only";

import { z, type ZodError, type ZodTypeAny } from "zod";
import { requireUser } from "@/features/auth/server";
import type { CacheNamespace } from "@/lib/cache";

/**
 * The action runner — the single module that owns the server-action contract.
 *
 * Each call site supplies:
 *   - schema:      Zod input shape
 *   - service:     (userId, parsedInput) => Promise<T | null>
 *                  (null means "not found / not yours" — the runner translates)
 *   - invalidates: CacheNamespace[] — runner calls `.invalidate(userId)` on
 *                  each after the write; namespaces own cross-namespace
 *                  cascades (see lib/cache.ts).
 *   - map:         (T) => actionData — shape the success envelope
 *
 * The runner owns:
 *   - requireUser (auth)
 *   - safeParse (-> fieldErrors envelope)
 *   - null -> not-found envelope
 *   - cache invalidation
 *   - ActionError catch (services throw this for translated domain errors,
 *     e.g. P2002 unique violations the action wants to surface as fieldErrors)
 *
 * Anything else (Prisma error translation, branching, special success shapes)
 * stays in the call site's service lambda.
 */

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};
export type ActionResult<T> = ActionOk<T> | ActionErr;

/**
 * Thrown from a service lambda to short-circuit the runner with a typed error
 * envelope. Use for domain errors callers should see (e.g. unique violations).
 * Unexpected errors should propagate so Next can render them.
 */
export class ActionError extends Error {
  payload: { error: string; fieldErrors?: Record<string, string[]> };
  constructor(payload: {
    error: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(payload.error);
    this.payload = payload;
    this.name = "ActionError";
  }
}

/**
 * True if the error is a Prisma unique-constraint violation (P2002).
 * Exposed here so service lambdas can translate to ActionError once.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    const key = String(issue.path[0]);
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

type DefineActionConfig<S extends ZodTypeAny, T, R> = {
  schema: S;
  invalidates?: readonly CacheNamespace[];
  service: (userId: string, input: z.output<S>) => Promise<T | null>;
  map: (result: T) => R;
};

export function defineAction<S extends ZodTypeAny, T, R>(
  config: DefineActionConfig<S, T, R>,
): (input: z.input<S>) => Promise<ActionResult<R>> {
  return async (input) => {
    const user = await requireUser();

    const parsed = config.schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    let result: T | null;
    try {
      result = await config.service(user.id, parsed.data);
    } catch (err) {
      if (err instanceof ActionError) {
        return { ok: false, ...err.payload };
      }
      throw err;
    }
    if (result === null) {
      return { ok: false, error: "Not found." };
    }

    for (const namespace of config.invalidates ?? []) {
      namespace.invalidate(user.id);
    }

    return { ok: true, data: config.map(result) };
  };
}

/** Common envelope helpers, used when a call site short-circuits. */
export const actionOk = <T>(data: T): ActionOk<T> => ({ ok: true, data });
export const actionErr = (
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionErr => ({ ok: false, error, fieldErrors });
