"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  Users,
  Headset,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

import { useNotifications } from "@/components/NotificationProvider";
import NotificationBell from "@/components/NotificationBell";

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

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/admin/dashboard"
      onClick={onClick}
      className="flex h-20 shrink-0 items-center gap-3 border-b border-rose-100/80 px-6 transition hover:opacity-90"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e76577] text-2xl font-bold text-white shadow-sm shadow-rose-200">
        B
      </span>
      <span>
        <span className="block text-lg font-bold tracking-tight text-slate-900">
          BookLeaf
        </span>
        <span className="block text-xs font-semibold text-slate-500">
          Publishing
        </span>
        <span className="mt-0.5 block text-[9px] font-bold tracking-[0.2em] text-[#e76577]">
          ADMIN PORTAL
        </span>
      </span>
    </Link>
  );
}

function NavigationList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { hasUnreadMessage, unreadCount, clearUnread } = useNotifications();

  return (
    <nav aria-label="Admin workspace" className="space-y-1.5">
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
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (isTickets) clearUnread();
              if (onItemClick) onItemClick();
            }}
            className={[
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-pink-50 font-semibold text-[#e76577] shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            <Icon
              size={19}
              strokeWidth={active ? 2.2 : 1.8}
              className={active ? "text-[#e76577]" : "text-slate-400"}
            />
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
  );
}

function SupportCard({ onActionClick }: { onActionClick?: () => void }) {
  const { clearUnread } = useNotifications();

  return (
    <div className="mt-6 rounded-2xl border border-rose-100 bg-[#fff3f4] p-4">
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
          onClick={() => {
            clearUnread();
            if (onActionClick) onActionClick();
          }}
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
          className="text-[10px] font-medium text-rose-400 underline transition hover:text-rose-600"
        >
          Test Alert
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState<{
    name: string;
    initials: string;
    role: string;
  } | null>(null);
  const pathname = usePathname();

  // Load real admin user info
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user?.name) {
          const parts = d.user.name.trim().split(/\s+/);
          const initials =
            parts.length === 1
              ? parts[0].slice(0, 2).toUpperCase()
              : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          setAdmin({
            name: d.user.name,
            initials,
            role: d.user.role || "admin",
          });
        }
      })
      .catch(() => {});
  }, []);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };

    if (mobileOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }

  return (
    <>
      {/* =========================================================================
          DESKTOP SIDEBAR (Visible on lg: and up)
         ========================================================================= */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-rose-100/80 bg-white lg:flex">
        <Brand />

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <NavigationList />

          <SupportCard />
        </div>

        {/* Admin profile & Logout footer */}
        <div className="mt-auto border-t border-slate-100 p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fde5e8] text-xs font-bold text-[#dc5368] border border-rose-200/60 shadow-2xs">
              {admin?.initials || "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {admin?.name || "Admin User"}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield size={11} className="text-[#e76577]" />
                <span className="capitalize">{admin?.role || "Administrator"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-red-600"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE TOP NAVBAR (Visible on < lg screens)
         ========================================================================= */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-rose-100/80 bg-white/95 px-4 backdrop-blur lg:hidden sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100/80 bg-rose-50/50 text-slate-700 transition hover:bg-rose-100/70 hover:text-[#e76577]"
          >
            <Menu size={22} />
          </button>

          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e76577] text-xl font-bold text-white shadow-xs">
              B
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">
                BookLeaf
              </span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e76577] uppercase">
                Admin Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />

          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fde5e8] text-xs font-bold text-[#dc5368] border border-rose-200/60 shadow-xs"
            title={`${admin?.name || "Admin User"} (${admin?.role || "Admin"})`}
          >
            {admin?.initials || "AD"}
          </div>
        </div>
      </header>

      {/* =========================================================================
          MOBILE SLIDE-OVER DRAWER (Visible on < lg screens when mobileOpen === true)
         ========================================================================= */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Slide Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Admin Navigation Drawer"
      >
        <div className="flex h-16 items-center justify-between border-b border-rose-100/80 px-5">
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e76577] text-xl font-bold text-white shadow-xs">
              B
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">
                BookLeaf
              </span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e76577] uppercase">
                Admin Portal
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <NavigationList onItemClick={() => setMobileOpen(false)} />

          <SupportCard onActionClick={() => setMobileOpen(false)} />
        </div>

        <div className="border-t border-slate-100 p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fde5e8] text-xs font-bold text-[#dc5368] border border-rose-200/60 shadow-2xs">
              {admin?.initials || "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {admin?.name || "Admin User"}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield size={11} className="text-[#e76577]" />
                <span className="capitalize">{admin?.role || "Administrator"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-red-600"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
