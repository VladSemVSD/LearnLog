import { requireUser } from "@/features/auth/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userName={user.name ?? user.email} userEmail={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
