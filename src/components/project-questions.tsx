"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProjectStatus, User } from "@/shared/types";
import type { ProjectPostKind, QuestionThread } from "@/shared/relay-types";
import { ApiRequestError, api, errorText, formatDate, formatDateTime, readable, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback } from "./ui";
import { MentorSelect, invalidateMentorWorkload } from "./mentor-workload";
import type { QuestionPriority } from "@/shared/p3-types";
import { PriorityReasons, invalidateProjectPriority, useProjectPriority } from "./priority";

export function stateLabel(thread: QuestionThread) {
  const mentor = thread.referral?.mentor.name;
  switch (thread.state) {
    case "discussion":
      return "Open discussion · no mentor requested";
    case "needs_referral":
      return "Waiting for Staff referral";
    case "awaiting_reply":
      return hasNewFollowUp(thread) ? `New follow-up · waiting for ${mentor}` : `Referred to ${mentor} · waiting for reply`;
    default:
      return `${mentor} replied`;
  }
}
export function hasNewFollowUp(thread: QuestionThread) {
  return thread.state === "awaiting_reply" && thread.posts.some((p) => p.kind === "mentor_reply");
}
export function StateBadge({ thread }: { thread: QuestionThread }) {
  return <span className={`question-state ${thread.state}`}>{stateLabel(thread)}</span>;
}
function RoleChip({ user }: { user: User }) {
  return <span className={`role-chip ${user.role}`}>{readable(user.role)}</span>;
}

function AskForm({ projectId, onPosted, onCancel }: { projectId: string; onPosted: (thread: QuestionThread) => void; onCancel: () => void }) {
  const { userId } = useIdentity();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [wantsMentor, setWantsMentor] = useState<"" | "yes" | "no">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) return setError("Write your question.");
    if (!wantsMentor) return setError("Choose whether you want a mentor to answer.");
    setError("");
    setBusy(true);
    try {
      const thread = await api<QuestionThread>(`/projects/${projectId}/questions`, userId, { title, body, wantsMentor: wantsMentor === "yes", dueAt: null });
      onPosted(thread);
    } catch (err) {
      setError(`Couldn’t post your question. ${errorText(err)} Your text is kept. Try again.`);
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack ask-form" onSubmit={submit} aria-label="Ask a question" noValidate>
      <Feedback error={error} />
      <label>
        Your question
        <input value={title} maxLength={160} readOnly={busy} onChange={(e) => setTitle(e.target.value)} placeholder="What are you stuck on?" />
        <span className="field-help">{title.trim().length}/160</span>
      </label>
      <label>
        Details <span className="optional">(optional)</span>
        <textarea rows={4} value={body} maxLength={10000} readOnly={busy} onChange={(e) => setBody(e.target.value)} />
      </label>
      <fieldset className="choice-group" disabled={busy}>
        <legend>Do you want a mentor to answer?</legend>
        <label className="choice">
          <input type="radio" name="wantsMentor" checked={wantsMentor === "yes"} onChange={() => setWantsMentor("yes")} />
          Yes, ask Staff to refer a mentor
        </label>
        <label className="choice">
          <input type="radio" name="wantsMentor" checked={wantsMentor === "no"} onChange={() => setWantsMentor("no")} />
          No, just open discussion
        </label>
      </fieldset>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? "Posting…" : "Post question"}
        </button>
      </div>
    </form>
  );
}

function ReferralPanel({ thread, onChanged }: { thread: QuestionThread; onChanged: (message: string) => void }) {
  const { userId, users } = useIdentity();
  const mentors = users.filter((u) => u.role === "mentor");
  const [open, setOpen] = useState(false);
  const [mentorId, setMentorId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!thread.question.wantsMentor)
    return <p className="metadata referral-note">The asker didn’t request a mentor, so this question isn’t in your workbench.</p>;
  if (thread.referral)
    return (
      <div className="referral-note">
        <button className="button secondary" disabled>
          Referred
        </button>
        <span className="metadata">
          {thread.referral.staff.name} referred {thread.referral.mentor.name} on {formatDate(thread.referral.createdAt)}. Each question can be referred once.
        </span>
      </div>
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || conflict) return;
    if (!mentorId) return setError("Choose a mentor.");
    if (!reason.trim()) return setError("Write why this mentor fits.");
    setError("");
    setBusy(true);
    try {
      const updated = await api<QuestionThread>(`/project-questions/${thread.question.id}/referral`, userId, { mentorId, reason });
      invalidateMentorWorkload();
      onChanged(`Referral sent. ${updated.referral?.mentor.name} will see this question in their workbench.`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ALREADY_REFERRED") {
        setConflict(true);
        setError("Already referred. Another Staff member referred this question a moment ago. Nothing was sent.");
      } else setError(`Couldn’t send the referral. ${errorText(err)} Your choices are kept. Try again.`);
      setBusy(false);
    }
  }
  if (!open)
    return (
      <div className="referral-note">
        <button className="button primary" onClick={() => setOpen(true)}>
          Refer a mentor
        </button>
        <span className="metadata">No mentor referred yet.</span>
      </div>
    );
  return (
    <form className="referral-form form-stack" onSubmit={submit} aria-label="Refer a mentor" noValidate>
      <Feedback error={error} />
      {conflict && (
        <button type="button" className="button secondary" onClick={() => onChanged("")}>
          Refresh question
        </button>
      )}
      {mentors.length ? (
        <MentorSelect mentors={mentors} value={mentorId} disabled={busy} onChange={setMentorId} />
      ) : (
        <p className="subtle-empty">No mentors in the directory yet. The question stays under “Needs referral”.</p>
      )}
      <label>
        Why this mentor fits
        <textarea rows={3} value={reason} maxLength={300} readOnly={busy} onChange={(e) => setReason(e.target.value)} />
        <span className="field-help">Shown to everyone under the question, and to the mentor. {reason.trim().length}/300</span>
      </label>
      <div className="inline-actions">
        <button type="submit" className="button primary" disabled={busy || conflict || !mentors.length}>
          {busy ? "Sending…" : "Send referral"}
        </button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Composer({ thread, onPosted }: { thread: QuestionThread; onPosted: () => void }) {
  const { user, userId } = useIdentity();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<ProjectPostKind | "">("");
  if (!user) return null;
  const referredMentor = thread.referral?.mentorId === user.id;
  const asker = thread.question.authorId === user.id;
  const actions: { kind: ProjectPostKind; label: string }[] = referredMentor
    ? [{ kind: "mentor_reply", label: "Post mentor reply" }, { kind: "comment", label: "Post as comment" }]
    : asker && thread.question.wantsMentor
      ? [{ kind: "follow_up", label: "Post follow-up" }, { kind: "comment", label: "Post comment" }]
      : [{ kind: "comment", label: "Post comment" }];
  const label = referredMentor ? "Reply as the referred mentor" : asker && thread.question.wantsMentor ? "Add a follow-up or comment" : "Add a comment";
  const help = referredMentor
    ? `${thread.referral!.staff.name} referred you to this question. A mentor reply is marked “Referred mentor reply”.`
    : asker && thread.question.wantsMentor
      ? "A follow-up asks the mentor to reply again. A comment, such as a thank-you, does not."
      : user.role === "mentor"
        ? "This will show as a regular comment. You haven’t been referred to this question."
        : "Comments are visible to everyone and don’t change who needs to reply.";
  async function post(kind: ProjectPostKind) {
    if (busy) return;
    if (!body.trim()) return setError("Write something before posting.");
    setError("");
    setBusy(kind);
    try {
      await api<QuestionThread>(`/project-questions/${thread.question.id}/posts`, userId, { body, kind });
      setBody("");
      onPosted();
    } catch (err) {
      setError(`Couldn’t post. ${errorText(err)} Your text is kept. Try again.`);
    } finally {
      setBusy("");
    }
  }
  const fieldId = `composer-${thread.question.id}`;
  return (
    <div className="composer">
      <label htmlFor={fieldId}>{label}</label>
      <textarea id={fieldId} rows={3} value={body} maxLength={10000} readOnly={!!busy} onChange={(e) => setBody(e.target.value)} />
      <span className="field-help">{help}</span>
      <Feedback error={error} />
      <div className="inline-actions">
        {actions.map((a, i) => (
          <button key={a.kind} type="button" className={i === 0 ? "button primary" : "button secondary"} disabled={!!busy} onClick={() => post(a.kind)}>
            {busy === a.kind ? "Posting…" : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const kindLabel: Record<ProjectPostKind, string> = { comment: "Comment", follow_up: "Follow-up", mentor_reply: "Referred mentor reply" };

// Only the asker sees this; the server also rejects everyone else, including the project owner.
function Thread({ thread, projectOwnerId, priority, highlighted, onChanged }: { thread: QuestionThread; projectOwnerId: string; priority?: QuestionPriority | null; highlighted: boolean; onChanged: () => void }) {
  const { user } = useIdentity();
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const q = thread.question;
  async function remove(post: QuestionThread["posts"][number]) {
    if (!user || deleting) return;
    const queueNote = post.kind === "mentor_reply"
      ? " The question may return to Awaiting reply."
      : post.kind === "follow_up" ? " The mentor's Awaiting reply count may change." : "";
    if (!window.confirm(`Delete this ${kindLabel[post.kind].toLowerCase()}? It will be removed from the discussion.${queueNote}`)) return;
    setDeleting(post.id);
    setDeleteError("");
    setSuccess("");
    try {
      await api<QuestionThread>(`/project-posts/${post.id}`, user.id, undefined, "DELETE");
      invalidateMentorWorkload();
      onChanged();
      setSuccess("Comment deleted.");
    } catch (error) {
      setDeleteError(`Couldn’t delete this comment. ${errorText(error)} Try again.`);
    } finally {
      setDeleting("");
    }
  }
  return (
    <article id={`q-${q.id}`} className={highlighted ? "question-thread highlighted" : "question-thread"} aria-label={q.title}>
      <div className="question-head">
        <StateBadge thread={thread} />
      </div>
      <h3>{q.title}</h3>
      {priority && (
        <div className="question-priority" aria-label="Question priority">
          <PriorityReasons reasons={priority.reasons} />
        </div>
      )}
      <p className="metadata">
        Asked by {thread.author.name} · {formatDateTime(q.createdAt)}
      </p>
      {q.body && <p className="question-body">{q.body}</p>}
      {thread.referral && (
        <div className="referral-row">
          <p>
            <strong>{thread.referral.staff.name}</strong> <RoleChip user={thread.referral.staff} /> referred <strong>{thread.referral.mentor.name}</strong>{" "}
            <RoleChip user={thread.referral.mentor} /> · {formatDate(thread.referral.createdAt)}
          </p>
          <p className="referral-reason">{thread.referral.reason}</p>
        </div>
      )}
      {thread.posts.length > 0 && (
        <ol className="post-list">
          {thread.posts.map((p) => (
            <li key={p.id} className={`post ${p.kind}`}>
              <div className="post-head">
                <span className="avatar small">{p.author.name.charAt(0)}</span>
                <strong>{p.author.name}</strong>
                <RoleChip user={p.author} />
                <span className={`kind-badge ${p.kind}`}>{kindLabel[p.kind]}</span>
                <span className="metadata">{formatDateTime(p.createdAt)}</span>
                {user && (p.authorId === user.id || projectOwnerId === user.id) && (
                  <button type="button" className="text-button post-delete" disabled={!!deleting}
                    aria-label={`Delete ${kindLabel[p.kind].toLowerCase()} by ${p.author.name}`} onClick={() => void remove(p)}>
                    {deleting === p.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      )}
      <Feedback success={success} error={deleteError} />
      {user?.role === "staff" && (
        <ReferralPanel
          thread={thread}
          onChanged={(message) => {
            setSuccess(message);
            onChanged();
          }}
        />
      )}
      <Composer
        thread={thread}
        onPosted={() => {
          setSuccess("");
          onChanged();
        }}
      />
    </article>
  );
}

export function ProjectQuestions({ projectId, projectOwnerId, status }: { projectId: string; projectOwnerId: string; status: ProjectStatus }) {
  const { user } = useIdentity();
  const { data, error, loading, reload: reloadThreads } = useResource<QuestionThread[]>(`/projects/${projectId}/questions`);
  const { data: priorityDetail } = useProjectPriority(projectId);
  const questionPriority = new Map(priorityDetail?.questions.map((q) => [q.questionId, q.priority]) ?? []);
  // Any write here can change waiting time or state, so priority views on the page re-read too.
  const reload = async () => {
    invalidateProjectPriority();
    await reloadThreads();
  };
  const [asking, setAsking] = useState(false);
  const [success, setSuccess] = useState("");
  const [hash, setHash] = useState("");
  const scrolled = useRef(false);
  const threads = data ?? [];
  useEffect(() => {
    if (!data || scrolled.current) return;
    const target = window.location.hash;
    if (target.startsWith("#q-")) {
      scrolled.current = true;
      setHash(target.slice(3));
      document.getElementById(target.slice(1))?.scrollIntoView({ block: "start" });
    }
  }, [data]);
  return (
    <section className="section-block questions" id="questions" aria-label="Questions and guidance">
      <div className="section-heading">
        <div>
          <h2>Questions &amp; guidance</h2>
          <p>Each question has its own flat discussion. Staff can refer a mentor when the asker requests one.</p>
        </div>
        {user?.role === "student" && !asking && (
          <button
            className="button primary"
            onClick={() => {
              setAsking(true);
              setSuccess("");
            }}
          >
            Ask a question
          </button>
        )}
      </div>
      {status !== "ongoing" && (
        <p className="state-note">This project is {readable(status)}. Questions, referrals and replies below stay open for discussion.</p>
      )}
      <Feedback error={error} success={success} />
      {asking && (
        <AskForm
          projectId={projectId}
          onCancel={() => setAsking(false)}
          onPosted={(thread) => {
            setAsking(false);
            setSuccess(thread.question.wantsMentor ? "Question posted. Staff will see it under Needs referral." : "Question posted as an open discussion.");
            void reload();
          }}
        />
      )}
      {loading && !data ? (
        <p className="subtle-empty" role="status">
          Loading questions…
        </p>
      ) : threads.length ? (
        threads.map((t) => (
          <Thread
            key={t.question.id}
            thread={t}
            projectOwnerId={projectOwnerId}
            highlighted={hash === t.question.id}
            priority={questionPriority.get(t.question.id)}
            onChanged={() => void reload()}
          />
        ))
      ) : (
        !error && (
          <div className="empty-questions">
            <strong>No questions yet.</strong>
            <p>Stuck on something specific? Ask here. Staff can refer a mentor to it.</p>
          </div>
        )
      )}
    </section>
  );
}
