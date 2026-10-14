"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { socket } from "@/app/lib/socket";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  sender: string;
  text: string;
  ticketId?: string;
  createdAt: string;
  read: boolean;
}

interface NewMessagePayload {
  sender?: string;
  text?: string;
  ticketId?: string;
}

interface NotificationContextType {
  hasUnreadMessage: boolean;
  unreadCount: number;
  latestSender: string | null;
  notifications: NotificationItem[];
  clearUnread: () => void;
  markAllRead: () => void;
  markItemRead: (id: string) => void;
  triggerNewMessage: (info?: NewMessagePayload) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  hasUnreadMessage: false,
  unreadCount: 0,
  latestSender: null,
  notifications: [],
  clearUnread: () => {},
  markAllRead: () => {},
  markItemRead: () => {},
  triggerNewMessage: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Gracefully ignore audio errors if autoplay policy blocks audio
  }
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestSender, setLatestSender] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const originalTitleRef = useRef<string>("");

  // Store original title on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      originalTitleRef.current = document.title || "BookLeaf Support";
    }
  }, []);

  const clearUnread = useCallback(() => {
    setHasUnreadMessage(false);
    setUnreadCount(0);
    setLatestSender(null);
    if (typeof document !== "undefined" && originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    clearUnread();
  }, [clearUnread]);

  const markItemRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (unreadCount <= 1) {
        setHasUnreadMessage(false);
        if (typeof document !== "undefined" && originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      }
    },
    [unreadCount],
  );

  const triggerNewMessage = useCallback(
    (info?: NewMessagePayload, notifyTabs = true) => {
      setHasUnreadMessage(true);
      setUnreadCount((prev) => prev + 1);

      const sender = info?.sender || "Support";
      setLatestSender(sender);

      // Add to notifications list
      const newItem: NotificationItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender,
        text: info?.text || "New message received",
        ticketId: info?.ticketId,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newItem, ...prev.slice(0, 19)]);

      // Play soft notification sound
      playNotificationChime();

      // Toast alert with high-contrast visible text
      toast.info(`New message from ${sender}`, {
        description: info?.text
          ? info.text.length > 70
            ? `${info.text.substring(0, 70)}...`
            : info.text
          : "You received a new message on a support ticket.",
        classNames: {
          title: "!text-gray-900 dark:!text-gray-100 !font-bold",
          description: "!text-gray-700 dark:!text-gray-300 !font-medium",
        },
      });

      // Synchronize across open browser tabs via localStorage
      if (notifyTabs && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "bookleaf_unread_ping",
            JSON.stringify({
              time: Date.now(),
              sender,
              text: info?.text,
              ticketId: info?.ticketId,
            }),
          );
        } catch {
          // Ignore storage errors
        }
      }
    },
    [],
  );

  // Dynamic Animated Title Flasher: Toggles document.title between "🔴 (1) New Message!" and the base page title
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!hasUnreadMessage) {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
      return;
    }

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title || "BookLeaf Support";
    }

    const cleanBaseTitle =
      originalTitleRef.current.replace(
        /^(?:🔴\s*)?(?:\(\d+\)\s*)?(?:New Message!?\s*•?\s*)?/i,
        "",
      ) || "BookLeaf Support";

    let toggle = false;
    const interval = setInterval(() => {
      toggle = !toggle;
      if (toggle) {
        const countBadge = unreadCount > 0 ? `(${unreadCount}) ` : "";
        document.title = `🔴 ${countBadge}New Message! • ${cleanBaseTitle}`;
      } else {
        document.title = cleanBaseTitle;
      }
    }, 1100);

    return () => {
      clearInterval(interval);
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [hasUnreadMessage, unreadCount]);

  // Connect socket and listen for real-time events & storage events
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Connect socket if not connected
    try {
      if (!socket.connected) {
        socket.connect();
      }
    } catch (err) {
      console.warn("Socket connect error:", err);
    }

    function handleSocketNewMessage(data: any) {
      const msg = data?.message || data;
      const pathname = window.location.pathname;
      const isAdminRoute = pathname.startsWith("/admin");
      const isAuthorRoute = pathname.startsWith("/author");

      // Don't notify the admin if the admin themselves sent the message
      if (isAdminRoute && msg?.senderRole === "Admin") {
        return;
      }
      // Don't notify the author if the author themselves sent the message
      if (isAuthorRoute && msg?.senderRole === "Author") {
        return;
      }

      triggerNewMessage({
        sender: msg?.sender,
        text: msg?.message || msg?.text,
        ticketId: data?.ticket_id || data?.ticketId,
      });
    }

    socket.on("message:new", handleSocketNewMessage);
    socket.on("ticket:new", handleSocketNewMessage);

    // Custom window event (usable by any page/component)
    function handleCustomEvent(e: Event) {
      const detail = (e as CustomEvent).detail;
      triggerNewMessage({
        sender: detail?.sender,
        text: detail?.text || detail?.message,
        ticketId: detail?.ticketId,
      });
    }

    window.addEventListener("bookleaf:new-message", handleCustomEvent);

    // Storage event for inter-tab communication
    function handleStorage(e: StorageEvent) {
      if (e.key === "bookleaf_unread_ping" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          triggerNewMessage(parsed, false);
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("storage", handleStorage);

    // Initial load of latest messages to populate the notifications dropdown list
    fetch("/api/tickets", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.tickets || !Array.isArray(data.tickets)) return;
        const initialList: NotificationItem[] = [];

        for (const t of data.tickets.slice(0, 10)) {
          const msgs = t.messages || [];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            initialList.push({
              id: last._id || `${t.ticket_id}-${Date.now()}`,
              sender: last.sender || "Support",
              text: last.message || "New message received",
              ticketId: t.ticket_id || t._id,
              createdAt: last.createdAt || t.updatedAt || new Date().toISOString(),
              read: true,
            });
          } else {
            initialList.push({
              id: `${t.ticket_id}-created`,
              sender: t.author_name || "Support",
              text: t.message || t.subject || "Support query created",
              ticketId: t.ticket_id || t._id,
              createdAt: t.createdAt || new Date().toISOString(),
              read: true,
            });
          }
        }
        setNotifications(initialList);
      })
      .catch(() => {});

    // Polling fallback every 6 seconds to ensure reliable notifications across network setups
    let previousTotalMessages = -1;
    let initialLoad = true;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/tickets", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const tickets = data.tickets || [];

        let currentTotal = 0;
        let latestMsgObj: any = null;

        for (const t of tickets) {
          const count = (t.messages || []).length + 1;
          currentTotal += count;

          if (t.messages && t.messages.length > 0) {
            const last = t.messages[t.messages.length - 1];
            if (
              !latestMsgObj ||
              new Date(last.createdAt) > new Date(latestMsgObj.createdAt)
            ) {
              latestMsgObj = { ...last, ticket_id: t.ticket_id };
            }
          } else {
            if (
              !latestMsgObj ||
              new Date(t.createdAt) > new Date(latestMsgObj.createdAt)
            ) {
              latestMsgObj = {
                sender: t.author_name,
                senderRole: "Author",
                message: t.message,
                createdAt: t.createdAt,
                ticket_id: t.ticket_id,
              };
            }
          }
        }

        if (initialLoad) {
          previousTotalMessages = currentTotal;
          initialLoad = false;
          return;
        }

        if (currentTotal > previousTotalMessages && latestMsgObj) {
          const pathname = window.location.pathname;
          const isAdminRoute = pathname.startsWith("/admin");
          const isAuthorRoute = pathname.startsWith("/author");

          if (
            (isAdminRoute && latestMsgObj.senderRole === "Author") ||
            (isAuthorRoute && latestMsgObj.senderRole === "Admin") ||
            (!isAdminRoute && !isAuthorRoute)
          ) {
            triggerNewMessage({
              sender: latestMsgObj.sender,
              text: latestMsgObj.message,
              ticketId: latestMsgObj.ticket_id,
            });
          }
          previousTotalMessages = currentTotal;
        }
      } catch {
        // Ignore polling errors
      }
    }, 6000);

    return () => {
      socket.off("message:new", handleSocketNewMessage);
      socket.off("ticket:new", handleSocketNewMessage);
      window.removeEventListener("bookleaf:new-message", handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollInterval);
    };
  }, [triggerNewMessage]);

  return (
    <NotificationContext.Provider
      value={{
        hasUnreadMessage,
        unreadCount,
        latestSender,
        notifications,
        clearUnread,
        markAllRead,
        markItemRead,
        triggerNewMessage,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
