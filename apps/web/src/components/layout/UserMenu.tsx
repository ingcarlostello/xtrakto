"use client";

import { UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { HEADER_COPY } from "./layout.constants";

// A client component: Clerk's UserButton.MenuItems can't be composed from a
// Server Component.
export function UserMenu() {
  return (
    <UserButton appearance={{ elements: { userButtonAvatarBox: "size-11" } }}>
      <UserButton.MenuItems>
        <UserButton.Link
          label={HEADER_COPY.settings}
          labelIcon={<Settings className="size-4" />}
          href="/settings"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
