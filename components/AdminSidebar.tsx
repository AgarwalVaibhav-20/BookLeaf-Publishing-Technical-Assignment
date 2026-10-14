"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  Users,
  Settings,
  Headset,
  LogOut,
  ChevronLeft,
} from "lucide-react";

import { useNotifications } from "@/components/NotificationProvider";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Support Tickets",
    href: "/admin/tickets",
    icon: Ticket,
  },
  {
    name: "Authors",
    href: "/admin/authors",
    icon: Users,
  },
  {
    name: "Books",
    href: "/admin/books",
    icon: BookOpen,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { hasUnreadMessage, unreadCount, clearUnread } = useNotifications();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e76577] text-lg font-bold text-white">
          B
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">
            BookLeaf
          </h1>
          <p className="text-xs text-gray-400">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isTickets = item.href === "/admin/tickets";

            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isTickets) clearUnread();
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-pink-50 text-[#e76577]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {isTickets && hasUnreadMessage ? (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-[#e76577] shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e76577] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e76577] shadow-[0_0_6px_#e76577]" />
                    </span>
                    {unreadCount > 1 ? `${unreadCount} New` : "New"}
                  </span>
                ) : active ? (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#e76577]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* <p className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          Preferences
        </p>

        <Link
          href="/admin/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
            pathname.startsWith("/admin/settings")
              ? "bg-pink-50 text-[#e76577]"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Settings size={19} />
          Settings
        </Link> */}
      </div>

      {/* Support card */}
      <div className="mx-4 mb-4 rounded-2xl bg-[#fff3f4] p-4">
        <div className="flex items-center gap-2 text-[#e76577]">
          <Headset size={19} />
          <p className="text-sm font-semibold">Need assistance?</p>
        </div>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Manage author queries and keep support requests moving.
        </p>

        <div className="mt-3 flex items-center justify-between">
          <Link
            href="/admin/tickets"
            onClick={clearUnread}
            className="text-xs font-semibold text-[#e76577] hover:underline"
          >
            View tickets →
          </Link>
          <button
            type="button"
            title="Simulate incoming author query alert"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("bookleaf:new-message", {
                  detail: {
                    sender: "Author Sharma",
                    text: "Hi support team, I have a query about my royalty payment status.",
                  },
                }),
              );
            }}
            className="text-[10px] text-rose-400 hover:text-rose-600 font-medium transition underline"
          >
            Test Alert
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 p-4">
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-red-600"
        >
          <LogOut size={19} />
          Logout
        </Link>
      </div>
    </aside>
  );
}
