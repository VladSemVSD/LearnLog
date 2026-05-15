import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-screen flex-1 flex-col items-center justify-center p-6">
      <div className="text-foreground mb-8 flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="size-5" />
        Learning Portal
      </div>
      <div className="bg-card text-card-foreground border-border w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
