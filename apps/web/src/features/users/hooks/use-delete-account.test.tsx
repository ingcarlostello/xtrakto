// @vitest-environment happy-dom
import { act, useEffect, useRef, useState, useTransition } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE_ACCOUNT_COPY } from "../user.constants";
import { useDeleteAccount } from "./use-delete-account";

const mocks = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  signOut: vi.fn(),
  navigatedTo: undefined as string | undefined,
}));

vi.mock("../actions/delete-account.action", () => ({
  deleteAccount: mocks.deleteAccount,
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: mocks.signOut }),
}));

// Clerk's signOut navigates as @clerk/nextjs's useInternalNavFun does: inside
// its own transition, with a promise that resolves once that transition has
// committed. React holds such a transition while another async action is
// pending, so awaiting signOut inside a transition never ends.
let navigate: (to: string) => Promise<void>;
const useAwaitableNavigation = () => {
  const [isPending, startTransition] = useTransition();
  const [, setPath] = useState("/settings");
  const waiting = useRef<Array<() => void>>([]);
  useEffect(() => {
    if (isPending) return;
    for (const resolve of waiting.current) resolve();
    waiting.current = [];
  }, [isPending]);
  return (to: string) =>
    new Promise<void>((resolve) => {
      waiting.current.push(resolve);
      startTransition(() => setPath(to));
    });
};

type Deletion = ReturnType<typeof useDeleteAccount>;
let deletion: Deletion;

type HarnessProps = {
  onRender: (
    navigate: (to: string) => Promise<void>,
    deletion: Deletion,
  ) => void;
};

function Harness({ onRender }: HarnessProps) {
  onRender(useAwaitableNavigation(), useDeleteAccount());
  return null;
}

let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.resetAllMocks();
  mocks.navigatedTo = undefined;
  mocks.signOut.mockImplementation(
    async ({ redirectUrl }: { redirectUrl: string }) => {
      await navigate(redirectUrl);
      mocks.navigatedTo = redirectUrl;
    },
  );
  root = createRoot(document.createElement("div"));
  act(() =>
    root.render(
      <Harness
        onRender={(navigateTo, current) => {
          navigate = navigateTo;
          deletion = current;
        }}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
});

describe("useDeleteAccount", () => {
  it("signs out to the sign-in page once the account is deleted", async () => {
    mocks.deleteAccount.mockResolvedValue({ ok: true, value: null });

    await act(async () => {
      void deletion.confirm();
    });

    await vi.waitFor(() => expect(mocks.navigatedTo).toBe("/sign-in"), {
      timeout: 1000,
    });
  });

  it("stays and offers a retry when the deletion fails", async () => {
    mocks.deleteAccount.mockRejectedValue(new Error("Clerk unavailable"));

    await act(async () => {
      await deletion.confirm();
    });

    expect(deletion.error).toBe(DELETE_ACCOUNT_COPY.failed);
    expect(deletion.isPending).toBe(false);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("asks to sign in again when the session has ended", async () => {
    mocks.deleteAccount.mockResolvedValue({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });

    await act(async () => {
      await deletion.confirm();
    });

    expect(deletion.error).toBe(DELETE_ACCOUNT_COPY.signedOut);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
