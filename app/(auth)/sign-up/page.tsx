import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata = { title: "Sign up · Learning Portal" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-sm">Get started in under a minute.</p>
      </div>
      <SignUpForm />
    </div>
  );
}
