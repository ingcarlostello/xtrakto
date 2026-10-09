import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inicia sesión" };

export default function SignInPage() {
  return <SignIn />;
}
