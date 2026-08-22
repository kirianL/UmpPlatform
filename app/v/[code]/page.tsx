import { redirect } from "next/navigation";

export default async function ShortVerifyRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = (code || "").trim().toUpperCase();
  redirect(`/aliados/verificar?code=${encodeURIComponent(cleanCode)}`);
}
