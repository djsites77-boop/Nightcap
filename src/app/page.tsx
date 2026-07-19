import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LandingPage />;
}
