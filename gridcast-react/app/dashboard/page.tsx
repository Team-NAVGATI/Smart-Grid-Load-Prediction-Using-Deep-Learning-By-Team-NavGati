import { redirect } from "next/navigation";

// Legacy /dashboard route — redirect to new company dashboard
export default function DashboardRedirect() {
  redirect("/company");
}