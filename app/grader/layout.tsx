import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/supabase/server";

export default async function GraderLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/grader");
  if (user.profile.role !== "grader") redirect("/");

  return (
    <AppShell
      role="grader"
      fullName={user.profile.full_name}
      nav={[{ href: "/grader", label: "Antrian" }]}
    >
      {children}
    </AppShell>
  );
}
