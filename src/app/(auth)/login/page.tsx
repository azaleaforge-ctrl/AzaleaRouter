import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun demo AzaleaRouter. Login disimulasikan — tidak ada server autentikasi nyata.",
};

export default function LoginPage() {
  return <LoginForm />;
}
