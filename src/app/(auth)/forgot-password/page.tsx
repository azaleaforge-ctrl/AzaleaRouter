import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "Lupa Password",
  description: "Minta tautan reset password. Alur reset disimulasikan — tidak ada email nyata yang dikirim.",
};

export default function ForgotPasswordPage() {
  return <ResetForm />;
}
