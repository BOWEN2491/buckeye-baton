"use client";
import { useState, type FormEvent } from "react";
import type { Discussion as DiscussionData, User } from "@/shared/types";
import { api, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Empty, Feedback, Loading } from "./ui";
export function Discussion({ lessonId }: { lessonId: string }) {
  const { user, userId, users } = useIdentity();
  const { data, error, loading, reload } = useResource<DiscussionData>(
    `/lessons/${lessonId}/comments`,
    userId,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [replyTo, setReplyTo] = useState<string>("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body"));
    setBusy(true);
    setActionError("");
    setSuccess("");
    try {
      await api(`/lessons/${lessonId}/comments`, userId, {
        body,
        kind: replyTo
          ? "reply"
          : user?.role === "student"
            ? "question"
            : "comment",
        parentId: replyTo || null,
      });
      form.reset();
      setReplyTo("");
      setSuccess("Your contribution was added.");
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-block" id="discussion">
      <div className="section-heading">
        <div>
          <h2>Ask, connect, move forward</h2>
          <p>Useful advice starts with a little context.</p>
        </div>
        <span className="count-badge">{data?.comments.length || 0}</span>
      </div>
      <Feedback error={error || actionError} success={success} />
      {loading && !data ? (
        <Loading />
      ) : !data?.comments.length ? (
        <Empty title="Start the conversation">
          Ask how this lesson might apply to your team.
        </Empty>
      ) : (
        <div className="discussion-list">
          {data.comments.map((c) => {
            const referrals = data.referrals.filter(
              (r) => r.questionCommentId === c.id,
            );
            return (
              <article
                className={`comment ${c.parentId ? "is-reply" : ""}`}
                key={c.id}
              >
                <div className="comment-author">
                  <span className={`avatar small ${c.author.role}`}>
                    {c.author.name.charAt(0)}
                  </span>
                  <strong>{c.author.name}</strong>
                  <span className="role-label">{c.author.role}</span>
                  <time>
                    {new Date(c.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                {c.parentId && (
                  <span className="metadata">
                    In reply to{" "}
                    {data.comments.find((x) => x.id === c.parentId)?.author
                      .name || "a question"}
                  </span>
                )}
                <p className="preserve-lines">{c.body}</p>
                <button
                  className="text-button"
                  onClick={() => setReplyTo(c.id)}
                >
                  Reply
                </button>
                {referrals.map((r) => (
                  <div className="referral-note" key={r.id}>
                    <span className="relay-small">↗</span>
                    <div>
                      <strong>
                        {r.staff.name} connected {r.mentor.name}
                      </strong>
                      <p>{r.reason}</p>
                      <span className="metadata">
                        {r.status === "completed"
                          ? "Mentor responded"
                          : "Awaiting mentor response"}
                      </span>
                      {userId === r.mentorId && r.status === "pending" && (
                        <MentorReply referralId={r.id} onSaved={reload} />
                      )}
                    </div>
                  </div>
                ))}
                {user?.role === "staff" && c.kind === "question" && (
                  <ReferralForm
                    questionId={c.id}
                    mentors={users.filter((u) => u.role === "mentor")}
                    onSaved={reload}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
      <form className="form-stack comment-form" onSubmit={submit}>
        <label htmlFor="comment-body">
          {replyTo
            ? "Your reply"
            : user?.role === "student"
              ? "What would you like to ask?"
              : "Add your perspective"}
        </label>
        {replyTo && (
          <div className="reply-context">
            Replying in this discussion{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => setReplyTo("")}
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          id="comment-body"
          name="body"
          rows={3}
          required
          placeholder="Share your situation and the decision you’re trying to make."
        />
        <div className="form-actions">
          <p>Posting as {user?.name || "demo user"}</p>
          <button className="button primary" disabled={busy}>
            {busy ? "Posting…" : replyTo ? "Post reply" : "Post contribution"}
          </button>
        </div>
      </form>
    </section>
  );
}
function ReferralForm({
  questionId,
  mentors,
  onSaved,
}: {
  questionId: string;
  mentors: User[];
  onSaved: () => Promise<void>;
}) {
  const { userId } = useIdentity();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/referrals", userId, {
        questionCommentId: questionId,
        mentorId: f.get("mentorId"),
        reason: f.get("reason"),
      });
      setOpen(false);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="referral-form">
      {!open ? (
        <button
          className="button secondary small-button"
          onClick={() => setOpen(true)}
        >
          ↗ Connect a mentor
        </button>
      ) : (
        <form onSubmit={submit} className="form-stack">
          <h4>Make a thoughtful connection</h4>
          <label>
            Mentor
            <select name="mentorId" required>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.headline}
                </option>
              ))}
            </select>
          </label>
          <label>
            Why this mentor?
            <textarea
              name="reason"
              rows={2}
              required
              placeholder="Explain why their experience fits this question."
            />
          </label>
          <Feedback error={error} />
          <div className="inline-actions">
            <button disabled={busy} className="button primary small-button">
              {busy ? "Connecting…" : "Send introduction"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
export function MentorReply({
  referralId,
  onSaved,
}: {
  referralId: string;
  onSaved: () => Promise<void>;
}) {
  const { userId } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api(`/referrals/${referralId}/replies`, userId, {
        body: String(new FormData(form).get("body")),
      });
      form.reset();
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack mentor-reply">
      <label>
        Your guidance
        <textarea
          name="body"
          rows={3}
          required
          placeholder="A useful next step, a caveat, or a question to test."
        />
      </label>
      <Feedback error={error} />
      <button className="button primary small-button" disabled={busy}>
        {busy ? "Sending…" : "Respond to introduction"}
      </button>
    </form>
  );
}
