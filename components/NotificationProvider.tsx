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
  messageId?: string;
  key?: string;
  sender?: string;
  text?: string;
  ticketId?: string;
  senderRole?: string;
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

function computeMessageKey(info?: NewMessagePayload): string {
  if (!info) return `unknown-${Date.now()}`;
  if (info.key) return info.key;
  if (info.messageId) return `id:${info.messageId}`;
  const tId = info.ticketId || "global";
  const sender = (info.sender || "support").trim().toLowerCase();
  const textSnippet = (info.text || "").trim().slice(0, 50).replace(/\s+/g, " ");
  return `${tId}:${sender}:${textSnippet}`;
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
  const processedKeysRef = useRef<Map<string, number>>(new Map());

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
      if (typeof window === "undefined") return;

      const pathname = window.location.pathname;
      const isAdminRoute = pathname.startsWith("/admin");
      const isAuthorRoute = pathname.startsWith("/author");
      const role = (info?.senderRole || "").toLowerCase();

      // Don't notify the admin if the admin themselves sent the message
      if (
        isAdminRoute &&
        (role === "admin" || (info?.sender && info.sender.toLowerCase().includes("support")))
      ) {
        return;
      }
      // Don't notify the author if the author themselves sent the message
      if (
        isAuthorRoute &&
        (role === "author" || (info?.sender && info.sender.toLowerCase().includes("author")))
      ) {
        return;
      }

      const key = computeMessageKey(info);
      const now = Date.now();

      // Expire keys older than 45 seconds to keep memory bounded
      if (processedKeysRef.current.size > 300) {
        for (const [k, time] of processedKeysRef.current.entries()) {
          if (now - time > 45000) {
            processedKeysRef.current.delete(k);
          }
        }
      }

      // STRICT DEDUPLICATION: If this message was already handled in the last 45s, skip
      if (processedKeysRef.current.has(key)) {
        return;
      }
      processedKeysRef.current.set(key, now);

      setHasUnreadMessage(true);
      setUnreadCount((prev) => prev + 1);

      const sender = info?.sender || "Support";
      setLatestSender(sender);

      // Add to notifications list
      const newItemId =
        info?.messageId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newItem: NotificationItem = {
        id: newItemId,
        sender,
        text: info?.text || "New message received",
        ticketId: info?.ticketId,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [
        newItem,
        ...prev.filter((n) => n.id !== newItemId).slice(0, 19),
      ]);

      // Play soft notification sound
      playNotificationChime();

      // Toast alert: using explicit id prevents duplicate Sonner toasts from stacking
      toast.info(`New message from ${sender}`, {
        id: `toast-${key}`,
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
      if (notifyTabs) {
        try {
          localStorage.setItem(
            "bookleaf_unread_ping",
            JSON.stringify({
              time: now,
              key,
              messageId: info?.messageId,
              sender,
              text: info?.text,
              ticketId: info?.ticketId,
              senderRole: info?.senderRole,
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
      triggerNewMessage({
        messageId: msg?._id || msg?.id,
        sender: msg?.sender,
        text: msg?.message || msg?.text,
        ticketId: data?.ticket_id || data?.ticketId,
        senderRole: msg?.senderRole,
      });
    }

    socket.on("message:new", handleSocketNewMessage);
    socket.on("ticket:new", handleSocketNewMessage);

    // Custom window event (usable by manual test triggers or external hooks)
    function handleCustomEvent(e: Event) {
      const detail = (e as CustomEvent).detail;
      triggerNewMessage({
        messageId: detail?.messageId,
        sender: detail?.sender,
        text: detail?.text || detail?.message,
        ticketId: detail?.ticketId,
        senderRole: detail?.senderRole,
      });
    }

    window.addEventListener("bookleaf:new-message", handleCustomEvent);

    // Storage event for inter-tab communication
    function handleStorage(e: StorageEvent) {
      if (e.key === "bookleaf_unread_ping" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // If already processed on this tab or stale, skip
          if (parsed.key && processedKeysRef.current.has(parsed.key)) {
            return;
          }
          if (Date.now() - (parsed.time || 0) > 10000) {
            return;
          }
          triggerNewMessage(parsed, false);
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("storage", handleStorage);

    // Initial load of latest messages to populate dropdown and prime the deduplication cache
    fetch("/api/tickets", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.tickets || !Array.isArray(data.tickets)) return;
        const initialList: NotificationItem[] = [];

        for (const t of data.tickets) {
          const msgs = t.messages || [];
          for (const m of msgs) {
            if (m._id) {
              processedKeysRef.current.set(`id:${m._id}`, Date.now());
            }
            if (t.ticket_id && m.sender && m.message) {
              const textSnippet = m.message.trim().slice(0, 50).replace(/\s+/g, " ");
              processedKeysRef.current.set(
                `${t.ticket_id}:${m.sender.toLowerCase()}:${textSnippet}`,
                Date.now(),
              );
            }
          }
          if (initialList.length < 10) {
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
        }
        setNotifications(initialList);
      })
      .catch(() => {});

    // Polling fallback every 6 seconds to ensure reliable notifications across network setups
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/tickets", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const tickets = data.tickets || [];

        for (const t of tickets) {
          const msgs = t.messages || [];
          for (const m of msgs) {
            const mId = m._id ? `id:${m._id}` : null;
            const textSnippet = (m.message || "")
              .trim()
              .slice(0, 50)
              .replace(/\s+/g, " ");
            const fallbackKey = `${t.ticket_id}:${(m.sender || "").toLowerCase()}:${textSnippet}`;
            const keyToCheck = mId || fallbackKey;

            if (!processedKeysRef.current.has(keyToCheck)) {
              // Only alert if created in the last 2 minutes
              const msgTime = new Date(m.createdAt).getTime();
              if (Date.now() - msgTime < 120000) {
                triggerNewMessage({
                  messageId: m._id,
                  sender: m.sender,
                  text: m.message,
                  ticketId: t.ticket_id,
                  senderRole: m.senderRole,
                });
              } else {
                processedKeysRef.current.set(keyToCheck, Date.now());
              }
            }
          }
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
