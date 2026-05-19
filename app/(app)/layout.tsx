import { Suspense } from "react";
import { requireUser } from "@/features/auth/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<TopbarFallback />}>
          <AuthedTopbar />
        </Suspense>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarFallback() {
  return (
    <aside className="border-border hidden w-56 shrink-0 border-r md:flex md:flex-col" />
  );
}

async function AuthedTopbar() {
  const user = await requireUser();
  return <Topbar userName={user.name ?? user.email} userEmail={user.email} />;
}

function TopbarFallback() {
  return (
    <header className="border-border flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4" />
  );
}
