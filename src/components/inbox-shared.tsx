"use client";
import { useEffect } from "react";

// Inbox views re-read on focus, when the page becomes visible, every 30 s while visible, and after
// any read/response on this page. Hidden pages skip the timer; unmounting stops it.
const changed = "buckeye-baton:inbox-changed";
export function notifyInboxChanged() {
  window.dispatchEvent(new Event(changed));
}
export function useLiveRefresh(reload: () => void) {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(changed, refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(changed, refresh);
    };
  }, [reload]);
}
