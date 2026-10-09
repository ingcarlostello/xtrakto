import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crea tu cuenta" };

export default function SignUpPage() {
  return <SignUp />;
}
