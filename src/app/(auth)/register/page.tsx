import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun demo AzaleaRouter. Registrasi dan verifikasi email disimulasikan.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
