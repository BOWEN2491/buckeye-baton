"use client";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/shared/types";
import type { Workbench as WorkbenchData } from "@/shared/relay-types";
import type { PrioritizedThread } from "@/shared/p3-types";
import { formatDate, readable, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Empty, Feedback, Loading } from "./ui";
import { StateBadge, hasNewFollowUp } from "./project-questions";
import { MentorWorkloadPanel } from "./mentor-workload";

type Tab = keyof WorkbenchData;
const tabs: Record<"staff" | "mentor", { key: Tab; label: string; empty: string; help: string }[]> = {
  staff: [
    { key: "needsReferral", label: "Needs referral", empty: "Nothing needs a referral right now.", help: "Open discussions that didn’t ask for a mentor are not listed." },
    { key: "referred", label: "Referred", empty: "No referrals yet.", help: "Questions you or other Staff have referred." },
  ],
  mentor: [
    { key: "awaitingReply", label: "Awaiting reply", empty: "No questions waiting for you.", help: "When Staff refer you to a question, it shows up here with their reason." },
    { key: "replied", label: "Replied", empty: "You haven’t replied to a referred question yet.", help: "A new follow-up from the asker moves a question back to Awaiting reply." },
  ],
};

function Item({ thread, project, role }: { thread: PrioritizedThread; project?: Project; role: "staff" | "mentor" }) {
  const { users } = useIdentity();
  const owner = users.find((u) => u.id === project?.ownerId);
  const q = thread.question;
  const lastReply = [...thread.posts].reverse().find((p) => p.kind === "mentor_reply");
  return (
    <li className="workbench-item">
      <div className="question-head">
        <StateBadge thread={thread} />
        {hasNewFollowUp(thread) && <span className="kind-badge follow_up">New follow-up</span>}
      </div>
      <Link className="workbench-title" href={`/projects/${q.projectId}#q-${q.id}`}>
        {q.title}
      </Link>
      <p className="metadata">
        {project ? `${project.title} · ${owner?.name ?? "Student team"} · ${readable(project.status)}` : "Project"} · asked by {thread.author.name} on {formatDate(q.createdAt)}
      </p>
      {thread.referral && (
        <p className="workbench-referral">
          {role === "staff"
            ? `${thread.referral.staff.name} referred ${thread.referral.mentor.name} · ${formatDate(thread.referral.createdAt)}`
            : `Referred by ${thread.referral.staff.name} · ${formatDate(thread.referral.createdAt)}: ${thread.referral.reason}`}
          {role === "mentor" && lastReply && thread.state === "replied" ? ` · You replied ${formatDate(lastReply.createdAt)}` : ""}
        </p>
      )}
    </li>
  );
}

export function RoleWorkbench({ role }: { role: "staff" | "mentor" }) {
  const { userId } = useIdentity();
  const { data, error, loading, reload } = useResource<Record<keyof WorkbenchData, PrioritizedThread[]>>("/workbench?sort=newest", userId);
  const { data: projects = [] } = useResource<Project[]>("/projects");
  const [tab, setTab] = useState<Tab>(tabs[role][0].key);
  const current = tabs[role].find((t) => t.key === tab)!;
  if (loading && !data) return <Loading />;
  if (!data)
    return (
      <div>
        <Feedback error={error} />
        <button className="button secondary" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  const list = data[tab];
  return (
    <section aria-label={role === "staff" ? "Staff workbench" : "Mentor workbench"}>
      <Feedback error={error} />
      {role === "staff" && <MentorWorkloadPanel />}
      <div className="filter-buttons workbench-tabs" role="group" aria-label="Workbench lists">
        {tabs[role].map((t) => (
          <button key={t.key} aria-pressed={tab === t.key} className={tab === t.key ? "selected" : ""} onClick={() => setTab(t.key)}>
            {t.label} ({data[t.key].length})
          </button>
        ))}
      </div>
      <div className="sort-bar">
        <p className="field-help">Newest questions first</p>
        <button type="button" className="text-button" onClick={() => void reload()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="field-help workbench-help">{current.help}</p>
      {list.length ? (
        <ul className="workbench-list">
          {list.map((t) => (
            <Item key={t.question.id} thread={t} project={projects.find((p) => p.id === t.question.projectId)} role={role} />
          ))}
        </ul>
      ) : (
        <Empty title={current.empty} />
      )}
    </section>
  );
}
