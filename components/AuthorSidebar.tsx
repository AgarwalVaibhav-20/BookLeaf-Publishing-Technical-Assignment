"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Headphones,
  LayoutDashboard,
  LogOut,
  Ticket,
  Menu,
  X,
  Bell,
} from "lucide-react";

import { useNotifications } from "@/components/NotificationProvider";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { label: "Dashboard", href: "/author/dashboard", icon: LayoutDashboard },
  { label: "My Books", href: "/author/books", icon: BookOpen },
  { label: "My Tickets", href: "/author/tickets", icon: Ticket },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/author/dashboard"
      onClick={onClick}
      className="flex h-[88px] shrink-0 items-center gap-3 border-b border-rose-100/80 px-6 transition hover:opacity-90"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f36678] text-3xl font-light text-white shadow-sm shadow-rose-200">
        /
      </span>
      <span>
        <span className="block text-lg font-bold tracking-tight text-slate-900">
          BookLeaf
        </span>
        <span className="block text-sm text-slate-500">Publishing</span>
        <span className="mt-1 block text-[9px] font-bold tracking-[0.2em] text-[#e76577]">
          AUTHOR PORTAL
        </span>
      </span>
    </Link>
  );
}

function NavigationList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { hasUnreadMessage, unreadCount, clearUnread } = useNotifications();

  return (
    <nav aria-label="Author workspace" className="space-y-1.5">
      {navItems.map(({ label, href, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        const isTickets = href === "/author/tickets";

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (isTickets) clearUnread();
              if (onItemClick) onItemClick();
            }}
            className={[
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-rose-50 text-[#e76577] shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            <Icon
              size={19}
              strokeWidth={active ? 2.2 : 1.8}
              className={active ? "text-[#e76577]" : "text-slate-400"}
            />
            <span>{label}</span>

            {isTickets && hasUnreadMessage && (
              <span className="ml-auto flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-[#e76577] shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e76577] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e76577] shadow-[0_0_6px_#e76577]" />
                </span>
                {unreadCount > 1 ? `${unreadCount} New` : "New"}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SupportCard({ onActionClick }: { onActionClick?: () => void }) {
  return (
    <section className="mt-8 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#e76577] shadow-sm">
        <Headphones size={20} />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-slate-900">
        Need assistance?
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Our support team can help with your books, royalties and publishing queries.
      </p>
      <Link
        href="/author/tickets/new"
        onClick={onActionClick}
        className="mt-4 flex items-center justify-center rounded-xl bg-[#f36678] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#df5266] shadow-sm shadow-rose-200"
      >
        Contact Support
      </Link>
    </section>
  );
}

export default function AuthorSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [author, setAuthor] = useState<{ name: string; initials: string } | null>(null);
  const pathname = usePathname();
  const { hasUnreadMessage, clearUnread } = useNotifications();

  // Load real author info
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
          setAuthor({ name: d.user.name, initials });
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

  return (
    <>
      {/* =========================================================================
          DESKTOP SIDEBAR (Visible on lg: and up)
         ========================================================================= */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-rose-100/80 bg-white lg:flex">
        <Brand />

        <div className="flex-1 overflow-y-auto px-4 py-7">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <NavigationList />

          <SupportCard />
        </div>

        <div className="mt-auto border-t border-slate-100 p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fde5e8] text-xs font-bold text-[#dc5368] border border-rose-200/60 shadow-2xs">
              {author?.initials || "AU"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {author?.name || "Author"}
              </p>
              <p className="text-[10px] text-slate-400">Author Account</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={16} />
            Sign out
          </Link>
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

          <Link href="/author/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f36678] text-xl font-light text-white shadow-xs">
              /
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">
                BookLeaf
              </span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e76577] uppercase">
                Author Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fde5e8] text-xs font-bold text-[#dc5368] border border-rose-200/60 shadow-xs"
            title={`${author?.name || "Author"} (Author)`}
          >
            {author?.initials || "AU"}
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
        aria-label="Mobile Navigation Drawer"
      >
        <div className="flex h-16 items-center justify-between border-b border-rose-100/80 px-5">
          <Link
            href="/author/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f36678] text-xl font-light text-white shadow-xs">
              /
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">
                BookLeaf
              </span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e76577] uppercase">
                Author Portal
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
              {author?.initials || "AU"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {author?.name || "Author"}
              </p>
              <p className="text-[10px] text-slate-400">Author Account</p>
            </div>
          </div>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={16} />
            Sign out
          </Link>
        </div>
      </aside>
    </>
  );
}
