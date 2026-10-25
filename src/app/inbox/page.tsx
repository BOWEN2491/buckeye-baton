"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityItem, InboxFilter, InboxItem, InboxPage, InboxPreferences, InvitationItem, InvitationRunnerStatus } from "@/shared/p4-types";
import { ApiRequestError, api, errorText, formatDateTime, readable, useResource } from "@/lib/client";
import { useIdentity } from "@/components/app-shell";
import { Feedback, PageHeading, Tags } from "@/components/ui";
import { notifyInboxChanged, useLiveRefresh } from "@/components/inbox-shared";

const filters: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "invitations", label: "Invitations" },
];

function activityTitle(i: ActivityItem) {
  const who = i.actor.name;
  if (i.removed) return "Comment removed";
  if (i.event === "question_created") return `${who} asked a question on your project`;
  if (i.event === "referral_created") return i.reasons.includes("assigned_mentor") ? "You were referred to a question" : `${who} referred a mentor to your question`;
  if (i.postKind === "mentor_reply") return i.reasons.includes("referring_staff") ? `${who} replied to the question you referred` : `${who} replied as the referred mentor`;
  if (i.postKind === "follow_up") return `${who} asked a follow-up`;
  return `${who} commented on “${i.questionTitle ?? "a question"}”`;
}
const invitationTitle = (i: InvitationItem) => (i.invitationKind === "pickup" ? "A paused project could use your experience" : "A question could use your experience");

function Item({ item, onOpen, onRead, onRespond, busy }: { item: InboxItem; onOpen: (item: InboxItem) => void; onRead: (item: InboxItem) => void; onRespond: (item: InvitationItem, action: "accept" | "ignore") => void; busy: boolean }) {
  const unread = !item.readAt;
  return (
    <li className={unread ? "inbox-item unread" : "inbox-item"} aria-label={item.kind === "activity" ? activityTitle(item) : invitationTitle(item)}>
      <div className="inbox-meta">
        <span className={`inbox-kind ${item.kind}`}>{item.kind === "activity" ? "Activity" : "Invitation"}</span>
        {unread && <span className="inbox-unread">Unread</span>}
        <span className="metadata">
          {item.kind === "activity" ? item.actor.name : "Buckeye Baton"} · {formatDateTime(item.createdAt)}
        </span>
      </div>
      <h3>{item.kind === "activity" ? activityTitle(item) : invitationTitle(item)}</h3>
      <p className="metadata">
        {item.projectTitle}
        {item.kind === "activity" && item.questionTitle ? ` · “${item.questionTitle}”` : ""}
      </p>
      {item.kind === "activity" && item.preview && <p className="inbox-preview">{item.preview}</p>}
      {item.kind === "invitation" && (
        <div className="inbox-invitation">
          <p>{item.reason}</p>
          <Tags tags={item.matchedTags} />
          {item.evidence.length > 0 && (
            <p className="metadata">
              Related:{" "}
              {item.evidence.map((e, i) => (
                <span key={e.projectId}>
                  {i > 0 && ", "}
                  <Link className="text-link" href={`/projects/${e.projectId}`}>
                    {e.projectTitle}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <p className="metadata">
            Status: <strong>{readable(item.status)}</strong>
            {item.status === "pending" ? ` · expires ${formatDateTime(item.expiresAt)}` : ""}
          </p>
          {item.status === "accepted" && item.actionable && item.invitationKind === "help" && (
            <p className="field-help">You can join the discussion with a comment. Only a mentor referred by Staff can post a formal mentor reply.</p>
          )}
        </div>
      )}
      <div className="inline-actions">
        {item.kind === "invitation" && item.status === "pending" && item.actionable && (
          <>
            <button className="button primary" disabled={busy} onClick={() => onRespond(item, "accept")}>
              Accept
            </button>
            <button className="button secondary" disabled={busy} onClick={() => onRespond(item, "ignore")}>
              Ignore
            </button>
          </>
        )}
        {item.kind === "invitation" && item.invitationKind === "pickup" && item.status === "accepted" && item.actionable ? (
          <Link className="button secondary" href={`/projects/${item.projectId}/pick-up`}>
            Continue to pickup
          </Link>
        ) : (
          <a
            className="button secondary"
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              onOpen(item);
            }}
          >
            {item.questionId ? "View question" : "View project"}
          </a>
        )}
        {unread && (
          <button className="text-button" disabled={busy} onClick={() => onRead(item)}>
            Mark as read
          </button>
        )}
      </div>
    </li>
  );
}

function Preferences() {
  const { userId } = useIdentity();
  const { data, error, reload } = useResource<InboxPreferences>("/inbox/preferences", userId);
  const [saving, setSaving] = useState(false);
  // Shows the chosen value while saving; cleared after the saved value is re-read, reverted on failure.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  async function toggle(value: boolean) {
    setSaving(true);
    setChosen(value);
    setFailure("");
    setMessage("");
    try {
      await api<InboxPreferences>("/inbox/preferences", userId, { automaticInvitations: value }, "PATCH");
      await reload();
      setChosen(null);
      notifyInboxChanged();
      setMessage(value ? "Automatic invitations are on." : "Automatic invitations are off. Pending invitations were cancelled.");
    } catch (err) {
      setChosen(null);
      setFailure(`Couldn’t save. ${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel inbox-settings" aria-label="Inbox settings">
      <h2>Settings</h2>
      {error && !data ? (
        <p className="workload-unavailable">
          Settings unavailable.{" "}
          <button className="text-button" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      ) : (
        <label className="choice-row">
          <input type="checkbox" checked={chosen ?? data?.automaticInvitations ?? true} disabled={!data || saving} onChange={(e) => void toggle(e.target.checked)} />
          Automatic invitations
        </label>
      )}
      <p className="field-help">Invitations suggest projects or questions that match your public experience. Activity updates will still arrive.</p>
      <Feedback error={failure} success={message} />
    </section>
  );
}

function RunnerStatus() {
  const { userId } = useIdentity();
  const { data, error, reload } = useResource<InvitationRunnerStatus>("/invitations/status", userId);
  return (
    <section className="panel inbox-settings" aria-label="Automatic invitation checks">
      <h2>Automatic invitation checks</h2>
      {error && !data ? (
        <p className="workload-unavailable">
          Status unavailable.{" "}
          <button className="text-button" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      ) : data ? (
        <>
          <p>
            Automatic dispatch: <strong>{data.enabled ? "On" : "Off"}</strong> · checks every {data.intervalSeconds} seconds while the server runs
          </p>
          <p className="metadata">Last successful check: {data.lastCompletedAt ? formatDateTime(data.lastCompletedAt) : "None yet"}</p>
          {data.error && <p className="workload-unavailable">The last check failed{data.lastFailureAt ? ` at ${formatDateTime(data.lastFailureAt)}` : ""}. It will be retried at the next check.</p>}
          <p className="field-help">A check with no matching people sends nothing; that is not a failure.</p>
        </>
      ) : (
        <p className="field-help">Loading…</p>
      )}
    </section>
  );
}

export default function InboxPageView() {
  const { user, userId } = useIdentity();
  const router = useRouter();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string; loaded: boolean }>({ loading: true, error: "", loaded: false });
  const [more, setMore] = useState({ loading: false, error: "" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ error: "", success: "" });
  const generation = useRef(0);
  const path = (c?: string | null) => `/inbox?filter=${filter}&limit=20${c ? `&cursor=${encodeURIComponent(c)}` : ""}`;
  // First page: replaces on a filter change; on refresh merges (new items first, known items updated) so
  // already loaded older pages are neither shuffled nor duplicated.
  const loadFirst = useCallback(async (merge: boolean) => {
    const current = ++generation.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const page = await api<InboxPage>(path(), userId);
      if (current !== generation.current) return;
      setUnread(page.unreadCount);
      setItems((old) => {
        if (!merge) return page.items;
        const fresh = new Map(page.items.map((i) => [i.id, i]));
        const known = new Set(old.map((i) => i.id));
        return [...page.items.filter((i) => !known.has(i.id)), ...old.map((i) => fresh.get(i.id) ?? i)];
      });
      if (!merge) setCursor(page.nextCursor);
      setState({ loading: false, error: "", loaded: true });
    } catch (err) {
      if (current === generation.current) setState((s) => ({ ...s, loading: false, error: errorText(err) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, userId]);
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setState({ loading: true, error: "", loaded: false });
    void loadFirst(false);
    return () => {
      generation.current++;
    };
  }, [loadFirst]);
  const refresh = useCallback(() => void loadFirst(true), [loadFirst]);
  useLiveRefresh(refresh);
  async function loadMore() {
    if (!cursor || more.loading) return;
    const current = generation.current;
    setMore({ loading: true, error: "" });
    try {
      const page = await api<InboxPage>(path(cursor), userId);
      if (current !== generation.current) return;
      setItems((old) => [...old, ...page.items.filter((i) => !old.some((o) => o.id === i.id))]);
      setCursor(page.nextCursor);
      setUnread(page.unreadCount);
      setMore({ loading: false, error: "" });
    } catch (err) {
      setMore({ loading: false, error: errorText(err) });
    }
  }
  const replace = (next: InboxItem) => setItems((old) => old.map((i) => (i.id === next.id ? next : i)));
  async function markRead(item: InboxItem) {
    setBusy(item.id);
    setNotice({ error: "", success: "" });
    try {
      replace(await api<InboxItem>(`/inbox/${item.id}`, userId, { read: true }, "PATCH"));
      notifyInboxChanged();
    } catch (err) {
      setNotice({ error: `Couldn’t mark as read. ${errorText(err)}`, success: "" });
    } finally {
      setBusy("");
    }
  }
  // Opening a message saves it as read first; it never accepts an invitation.
  async function open(item: InboxItem) {
    if (!item.readAt) {
      try {
        await api<InboxItem>(`/inbox/${item.id}`, userId, { read: true }, "PATCH");
      } catch {
        /* still open the discussion */
      }
    }
    router.push(item.href);
  }
  async function respond(item: InvitationItem, action: "accept" | "ignore") {
    setBusy(item.id);
    setNotice({ error: "", success: "" });
    try {
      replace(await api<InvitationItem>(`/invitations/${item.id}/respond`, userId, { action }, "POST"));
      notifyInboxChanged();
      setNotice({ error: "", success: action === "accept" ? "Invitation accepted. Nothing was created or assigned for you." : "Invitation ignored." });
    } catch (err) {
      setNotice({ error: err instanceof ApiRequestError && err.code === "INVITATION_UNAVAILABLE" ? "This invitation is no longer available." : `Couldn’t respond. ${errorText(err)}`, success: "" });
      refresh();
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="inbox-page">
      <PageHeading title="Inbox" description="Updates on your projects and questions, plus invitations that match your experience." />
      <div className="sort-bar">
        <div className="filter-buttons" role="group" aria-label="Inbox filters">
          {filters.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} className={filter === f.key ? "selected" : ""} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="priority-updated">
          {unread !== null && !state.error ? `${unread} unread · ` : ""}
          <button type="button" className="text-button" onClick={refresh} disabled={state.loading}>
            {state.loading && state.loaded ? "Refreshing…" : "Refresh"}
          </button>
        </p>
      </div>
      <Feedback error={notice.error} success={notice.success} />
      {state.error && (
        <div className="notice error" role="alert">
          Couldn’t load your inbox. {state.error}{" "}
          <button className="text-button" onClick={refresh}>
            Retry
          </button>
        </div>
      )}
      {!state.loaded && !state.error ? (
        <p className="subtle-empty" role="status">
          Loading your inbox…
        </p>
      ) : state.loaded && !items.length ? (
        <div className="empty-questions">
          <strong>You&apos;re all caught up</strong>
          <p>{filter === "invitations" ? "No invitations yet." : filter === "unread" ? "No unread messages." : "No messages yet."}</p>
        </div>
      ) : (
        <ul className="inbox-list">
          {items.map((item) => (
            <Item key={item.id} item={item} busy={busy === item.id} onOpen={(i) => void open(i)} onRead={(i) => void markRead(i)} onRespond={(i, a) => void respond(i, a)} />
          ))}
        </ul>
      )}
      {cursor && (
        <div className="inline-actions inbox-more">
          <button className="button secondary" onClick={() => void loadMore()} disabled={more.loading}>
            {more.loading ? "Loading…" : "Load more"}
          </button>
          {more.error && <span className="workload-unavailable">Couldn’t load more. {more.error}</span>}
        </div>
      )}
      <Preferences />
      {user?.role === "staff" && <RunnerStatus />}
    </div>
  );
}
