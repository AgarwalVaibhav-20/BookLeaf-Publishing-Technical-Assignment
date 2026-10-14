import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { verifyToken } from "../lib/jwt";
import AuthorSidebar from "@/components/AuthorSidebar";

export const instant = false;

export default async function AuthorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const decode = verifyToken(token);

  if (!decode || typeof decode === "string") {
    redirect("/login");
  }

  if (decode.role !== "author") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-white text-[#303030]">
      <AuthorSidebar />

      <div className="min-h-screen min-w-0 lg:pl-64">
        <main className="min-h-screen min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}
