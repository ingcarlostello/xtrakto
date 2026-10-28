import "server-only";
import { cookies } from "next/headers";
import { requireSignedIn } from "./auth";

/**
 * The example's user (7.8): invented data, loaded on demand. Not a Clerk
 * id, whose users all start with "user_", so no one signs in as it.
 */
export const EXAMPLE_CLERK_USER_ID = "xtrakto_example";

// Only says whether this browser is exploring the example; whose data it
// shows is the server's constant above, never the cookie's.
const EXAMPLE_COOKIE = "xtrakto-example";
const EXPLORING = "1";

/** Whose data the data pages show, and whether it's the example's. */
export type Viewer = {
  readonly clerkUserId: string;
  readonly isExample: boolean;
};

/**
 * The signed-in user's data, or the example's while this browser explores
 * it. Resumen, Movimientos, Pagos fijos, Categorías and the quick review
 * call it instead of `requireSignedIn()`; Subir and Perfil are always the
 * user's, and so is every action.
 */
export const requireViewer = async (): Promise<Viewer> => {
  const clerkUserId = await requireSignedIn();
  const isExample = (await cookies()).get(EXAMPLE_COOKIE)?.value === EXPLORING;
  return isExample
    ? { clerkUserId: EXAMPLE_CLERK_USER_ID, isExample }
    : { clerkUserId, isExample };
};

/** Starts the example in this browser. Only server actions may call it. */
export const startExample = async (): Promise<void> => {
  (await cookies()).set(EXAMPLE_COOKIE, EXPLORING, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
};

/** Back to the user's own data. Only server actions may call it. */
export const endExample = async (): Promise<void> => {
  (await cookies()).delete(EXAMPLE_COOKIE);
};
