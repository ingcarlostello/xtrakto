import Image from "next/image";

// Sign-in and sign-up: the stacked logo (docs/brand.md §2) above Clerk's card,
// on the brand background.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-7.5">
      <Image
        src="/brand/xtrakto-logo-stacked.svg"
        alt="Xtrakto"
        width={121}
        height={80}
        priority
      />
      {children}
    </main>
  );
}
