import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { SESSION_COPY as COPY } from "../user.constants";
import { EndSessionButton } from "./EndSessionButton";

/**
 * "Sesión" (docs/ui/v8-11): when the user last signed in, without the
 * browser and system v8 shows, and "Cerrar sesión".
 */
export function ProfileSession({ lastSignIn }: { lastSignIn: string | null }) {
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold">{COPY.title}</h2>
        {/* The time ends the sentence with its own period: "8:42 a. m." */}
        {lastSignIn && (
          <CardDescription>{`${COPY.lastSignIn} ${lastSignIn}`}</CardDescription>
        )}
      </CardHeader>
      <EndSessionButton />
    </Card>
  );
}
