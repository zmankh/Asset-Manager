import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Medal, Trophy, BookOpen, Info, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch
} from "firebase/firestore";
import { cn } from "@/lib/utils";

interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: "badge" | "level" | "exam" | "info" | "streak";
  read: boolean;
  createdAt: string;
}

function NotifIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  if (type === "badge") return <Medal className={cn(cls, "text-yellow-500")} />;
  if (type === "level") return <Trophy className={cn(cls, "text-green-500")} />;
  if (type === "exam") return <BookOpen className={cn(cls, "text-blue-500")} />;
  if (type === "streak") return <Flame className={cn(cls, "text-orange-500")} />;
  return <Info className={cn(cls, "text-primary")} />;
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "userNotifications"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: UserNotification[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30);
      setNotifs(items);
    });

    return () => unsub();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "userNotifications", id), { read: true });
  };

  const markAllRead = async () => {
    if (!auth.currentUser) return;
    const unreadItems = notifs.filter((n) => !n.read);
    if (unreadItems.length === 0) return;
    const batch = writeBatch(db);
    unreadItems.forEach((n) => {
      batch.update(doc(db, "userNotifications", n.id), { read: true });
    });
    await batch.commit();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-sidebar-accent transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5 text-sidebar-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-2 w-80 max-h-[480px] bg-popover border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ direction: "rtl" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-bold text-sm">الإشعارات</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                قراءة الكل
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "w-full text-right px-4 py-3 hover:bg-muted/30 transition-colors flex gap-3 items-start",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    n.type === "badge" ? "bg-yellow-100 dark:bg-yellow-900/30" :
                    n.type === "level" ? "bg-green-100 dark:bg-green-900/30" :
                    n.type === "exam" ? "bg-blue-100 dark:bg-blue-900/30" :
                    n.type === "streak" ? "bg-orange-100 dark:bg-orange-900/30" :
                    "bg-primary/10"
                  )}>
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-semibold leading-tight", !n.read && "text-foreground")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
