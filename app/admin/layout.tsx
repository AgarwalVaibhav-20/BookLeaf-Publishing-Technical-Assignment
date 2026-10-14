import { cookies } from "next/headers";
import React from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { verifyToken } from "@/app/lib/jwt";
import AdminSidebar from "@/components/AdminSidebar";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let decoded;

  try {
    decoded = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  if (!decoded || typeof decoded === "string") {
    redirect("/login");
  }

  if (decoded.role !== "admin") {
    redirect("/author/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-800">
      <AdminSidebar />

      <div className="min-h-screen min-w-0 lg:pl-64">
        <main className="min-h-screen min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}
