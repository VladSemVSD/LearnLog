import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Sign in · Learning Portal" };

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account to continue.</p>
      </div>
      <SignInForm />
    </div>
  );
}
