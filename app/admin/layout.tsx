import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.profile.role !== "admin") redirect("/");

  return (
    <AppShell
      role="admin"
      fullName={user.profile.full_name}
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/factories", label: "Pabrik" },
        { href: "/admin/certificates", label: "Sertifikat" },
        { href: "/admin/categories", label: "Kategori & bobot" },
      ]}
    >
      {children}
    </AppShell>
  );
}
