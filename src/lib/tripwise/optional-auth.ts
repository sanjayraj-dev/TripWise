import { createMiddleware } from "@tanstack/react-start";

/**
 * Forwards the preview bearer token and resolves the caller if signed in.
 * Unlike authMiddleware, a guest is allowed — `userId` is null.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser(
      (context as { bearerToken?: string }).bearerToken,
    );
    return next({ context: { userId: user?.id ?? null } });
  });
