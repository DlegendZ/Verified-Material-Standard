import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/supabase/server";

export default async function FactoryLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/factory");
  if (user.profile.role !== "factory") redirect("/");

  return (
    <AppShell
      role="factory"
      fullName={user.profile.full_name}
      nav={[
        { href: "/factory", label: "Dashboard" },
        { href: "/factory/batches/new", label: "Ajukan batch" },
        { href: "/factory/profile", label: "Profil pabrik" },
      ]}
    >
      {children}
    </AppShell>
  );
}
