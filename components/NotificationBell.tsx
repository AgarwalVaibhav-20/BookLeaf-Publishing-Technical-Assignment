"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Inbox,
  MessageSquare,
  X,
} from "lucide-react";
import { useNotifications, type NotificationItem } from "./NotificationProvider";

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

interface NotificationContentProps {
  unreadCount: number;
  notifications: NotificationItem[];
  markAllRead: () => void;
  onClose: () => void;
  onNotificationClick: (item: NotificationItem) => void;
  ticketsBaseUrl: string;
}

function NotificationContent({
  unreadCount,
  notifications,
  markAllRead,
  onClose,
  onNotificationClick,
  ticketsBaseUrl,
}: NotificationContentProps) {
  return (
    <div className="flex flex-col h-full max-h-[80vh] sm:max-h-[500px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-[#e76577]">
              {unreadCount} new
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
              {notifications.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={markAllRead}
              title="Mark all as read"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <CheckCheck size={14} />
              <span>Mark read</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <Inbox size={22} />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-800">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              When new messages, ticket updates, or staff replies arrive, they will appear right here.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNotificationClick(item)}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition hover:bg-rose-50/40 ${
                !item.read ? "bg-rose-50/20 font-medium" : "bg-white"
              }`}
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-xs font-bold text-[#e76577]">
                {item.sender.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-gray-900">
                    {item.sender}
                  </p>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 leading-snug">
                  {item.text}
                </p>

                {item.ticketId && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    <MessageSquare size={10} />
                    {item.ticketId}
                  </span>
                )}
              </div>

              {/* Unread indicator dot */}
              {!item.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e76577]" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 p-3 bg-gray-50/50 rounded-b-2xl">
        <Link
          href={ticketsBaseUrl}
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#e76577] transition hover:text-[#d95468]"
        >
          <span>View all tickets</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function NotificationBell({
  className = "",
  buttonClassName = "",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const {
    hasUnreadMessage,
    unreadCount,
    notifications,
    markAllRead,
    markItemRead,
    clearUnread,
  } = useNotifications();

  const isAdmin = pathname.startsWith("/admin");
  const ticketsBaseUrl = isAdmin ? "/admin/tickets" : "/author/tickets";

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        !isMobile &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isMobile]);

  // Lock body scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen && hasUnreadMessage) {
      clearUnread();
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markItemRead(item.id);
    setIsOpen(false);
    if (item.ticketId) {
      router.push(`${ticketsBaseUrl}/${encodeURIComponent(item.ticketId)}`);
    } else {
      router.push(ticketsBaseUrl);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Open notifications menu"
        aria-expanded={isOpen}
        className={
          buttonClassName ||
          "relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#e76577] focus:outline-hidden"
        }
      >
        <Bell size={18} />

        {/* Unread pulsing badge */}
        {hasUnreadMessage && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e76577] opacity-75" />
            <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-[#e76577] text-[9px] font-bold text-white shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount || ""}
            </span>
          </span>
        )}
      </button>

      {/* Notifications Popover: Centered Modal on Mobile, Dropdown on Desktop */}
      {isOpen && (
        mounted && isMobile ? (
          createPortal(
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />

              {/* Centered Modal */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Notifications"
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-[390px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
              >
                <NotificationContent
                  unreadCount={unreadCount}
                  notifications={notifications}
                  markAllRead={markAllRead}
                  onClose={() => setIsOpen(false)}
                  onNotificationClick={handleNotificationClick}
                  ticketsBaseUrl={ticketsBaseUrl}
                />
              </div>
            </>,
            document.body
          )
        ) : (
          /* Desktop Dropdown */
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
            <NotificationContent
              unreadCount={unreadCount}
              notifications={notifications}
              markAllRead={markAllRead}
              onClose={() => setIsOpen(false)}
              onNotificationClick={handleNotificationClick}
              ticketsBaseUrl={ticketsBaseUrl}
            />
          </div>
        )
      )}
    </div>
  );
}
