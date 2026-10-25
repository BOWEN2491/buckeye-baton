"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/shared/types";
import { useResource } from "@/lib/client";
import type { InboxPage } from "@/shared/p4-types";
import { useLiveRefresh } from "./inbox-shared";
const IdentityContext = createContext<{
  user?: User;
  users: User[];
  userId: string;
}>({ users: [], userId: "student-mia" });
export const useIdentity = () => useContext(IdentityContext);
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    ),
    book: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" />
        <path d="M12 5v15" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    inbox: (
      <>
        <path d="M4 13h4l2 3h4l2-3h4" />
        <path d="M5 5h14l1 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" />
      </>
    ),
    relay: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="19" r="2" />
        <path d="M6 7v10m12-10v2c0 4-12 2-12 7" />
      </>
    ),
    link: (
      <>
        <path d="m10 14 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.book}
    </svg>
  );
}
// Unread count for the current identity only; the resource key includes the identity, so a previous
// identity's late response is discarded. On failure no number is shown (never a fake 0).
function InboxNavLink({ userId, active }: { userId: string; active: boolean }) {
  const { data, error, reload } = useResource<InboxPage>("/inbox?limit=1", userId);
  useLiveRefresh(reload);
  const unread = !error ? data?.unreadCount ?? 0 : 0;
  return (
    <Link className={active ? "nav-link active" : "nav-link"} href="/inbox">
      <Icon name="inbox" />
      Inbox
      {unread > 0 && (
        <span className="nav-badge" aria-label={`${unread} unread`}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: users = [], reload: reloadUsers } = useResource<User[]>("/users");
  useEffect(() => {
    const refresh = () => void reloadUsers();
    window.addEventListener("buckeye-baton:expertise-updated", refresh);
    return () => window.removeEventListener("buckeye-baton:expertise-updated", refresh);
  }, [reloadUsers]);
  const { data: health } = useResource<{ databaseMode: string }>("/health");
  const [userId, setUserId] = useState("student-mia");
  useEffect(() => {
    setUserId(localStorage.getItem("buckeye-baton-user") || "student-mia");
  }, []);
  const user = users.find((u) => u.id === userId);
  return (
    <IdentityContext.Provider value={{ user, users, userId }}>
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Icon name="link" size={30} />
            </span>
            Buckeye Baton<span className="brand-dot">.</span>
          </Link>
          <div className="school-label">THE OHIO STATE UNIVERSITY</div>
          <nav aria-label="Main navigation">
            <Link
              className={pathname === "/" ? "nav-link active" : "nav-link"}
              href="/"
            >
              <Icon name="search" />
              Explore
            </Link>
            <Link
              className={
                pathname === "/workspace" ? "nav-link active" : "nav-link"
              }
              href="/workspace"
            >
              <Icon name="folder" />
              My workspace
            </Link>
            {user?.role === "mentor" && <Link className={pathname === "/profile" ? "nav-link active" : "nav-link"} href="/profile"><Icon name="book" />My expertise</Link>}
            <InboxNavLink key={userId} userId={userId} active={pathname === "/inbox"} />
          </nav>
          <div className="sidebar-note">
            <Icon name="relay" />
            <p>
              The project ends.
              <br />
              <strong>The lessons keep going.</strong>
            </p>
          </div>
          <div className="identity">
            <label htmlFor="demo-user">Exploring as</label>
            <div className="identity-select">
              <span className="avatar">{user?.name.charAt(0) || "M"}</span>
              <select
                id="demo-user"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  localStorage.setItem("buckeye-baton-user", e.target.value);
                  router.replace("/");
                }}
              >
                {users.length ? (
                  users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </option>
                  ))
                ) : (
                  <option value="student-mia">Mia · student</option>
                )}
              </select>
            </div>
            <div className="demo-note">
              <span className="demo-dot" />
              Demo identities · not real sign-in
            </div>
            <p className="fine-print">
              {health?.databaseMode === "postgres"
                ? "Connected PostgreSQL"
                : "Local SQL demo · saved on this machine"}
            </p>
          </div>
        </aside>
        <main className="main-content" key={userId}>
          {children}
        </main>
      </div>
    </IdentityContext.Provider>
  );
}
