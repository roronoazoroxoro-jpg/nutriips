"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { api } from "@/lib/client";
import { cx } from "./ui";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await api<{ notifications: NotificationItem[]; unread: number }>("/api/notifications");
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 45000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markAll() {
    await api("/api/notifications/read", { method: "POST", json: {} });
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnread(0);
  }

  async function openItem(item: NotificationItem) {
    if (!item.read) {
      await api("/api/notifications/read", { method: "POST", json: { id: item.id } });
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnread((n) => Math.max(0, n - 1));
    }
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  return (
    <div ref={rootRef} className={cx("relative", compact ? "" : "px-3 pb-2")}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className={cx(
          "relative flex items-center justify-center rounded-xl transition",
          compact ? "p-2 hover:bg-ink-900/5" : "w-full gap-2 bg-white/[0.07] px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        )}
        aria-label="Notificaciones"
      >
        <Bell className={compact ? "h-5 w-5" : "h-4 w-4"} />
        {!compact && <span className="flex-1 text-left">Notificaciones</span>}
        {unread > 0 && (
          <span className={cx("grid min-w-[1.15rem] place-items-center rounded-full bg-leaf-500 px-1 text-[10px] font-bold text-ink-950", compact && "absolute -right-0.5 -top-0.5")}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cx(
            "absolute z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-lift",
            compact ? "right-0 top-full mt-2" : "left-3 right-3 bottom-full mb-2 w-auto"
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-900/[0.06] px-3 py-2.5">
            <p className="text-sm font-semibold text-ink-950">Notificaciones</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-medium text-leaf-700 hover:underline">
                Marcar leídas
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-500">Sin novedades por ahora.</li>}
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cx("w-full border-b border-ink-900/[0.04] px-3 py-3 text-left transition hover:bg-sand-50", !item.read && "bg-leaf-50/60")}
                >
                  <p className="text-sm font-medium text-ink-950">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{item.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400">
                    {new Date(item.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
