"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { ProjectReflection } from "@/shared/types";
import type { RelayProjectDetail } from "@/shared/relay-types";
import { useResource } from "@/lib/client";
import { useIdentity } from "@/components/app-shell";
import { Feedback, Loading, PageHeading, Status, Tags } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { ProjectQuestions } from "@/components/project-questions";
import { IntroductionPanel } from "@/components/introduction-panel";
import { PriorityPanel } from "@/components/priority-panel";
import { flashKey, SourceLine, Successors } from "@/components/relay-links";
function Text({ value, empty }: { value?: string; empty: string }) {
  return (
    <p className={value ? "reflection-prose" : "subtle-empty"}>
      {value || empty}
    </p>
  );
}
function Items({ values, empty }: { values?: string[]; empty: string }) {
  return values?.length ? (
    <ul className="reflection-list">
      {values.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  ) : (
    <p className="subtle-empty">{empty}</p>
  );
}
function Reflections({
  status,
  reflection,
  summary,
}: {
  status: string;
  reflection: ProjectReflection | null;
  summary: string;
}) {
  if (status === "ongoing")
    return (
      <section className="reflection-hero ongoing">
        <p className="eyebrow">From the team</p>
        <h2>What we’re working toward</h2>
        <p className="reflection-prose">{summary}</p>
        <h2>Current progress</h2>
        <Text
          value={reflection?.progress}
          empty="The team has not shared its progress yet."
        />
      </section>
    );
  if (status === "finished")
    return (
      <section className="reflection-hero finished">
        <p className="eyebrow">From the team</p>
        <h2>What we got</h2>
        <Items
          values={reflection?.outcomes}
          empty="The team has not added its outcomes yet."
        />
        <h2>Problems we encountered</h2>
        {reflection?.problems.length ? (
          reflection.problems.map((p, i) => (
            <article className="problem-box" key={i}>
              <h3>{p.title}</h3>
              <dl className="reflection-steps">
                <dt>We assumed</dt>
                <dd>{p.assumed}</dd>
                <dt>What happened</dt>
                <dd>{p.happened}</dd>
                <dt>We changed</dt>
                <dd>{p.changed}</dd>
              </dl>
            </article>
          ))
        ) : (
          <p className="subtle-empty">No problem reflections shared yet.</p>
        )}
        <h2>For the next team</h2>
        <Text
          value={reflection?.nextTeam}
          empty="The team has not shared its advice yet."
        />
      </section>
    );
  return (
    <section className="reflection-hero paused">
      <p className="eyebrow">From the team</p>
      <h2>Why we paused</h2>
      <Text
        value={reflection?.whyPaused}
        empty="The team has not shared why it paused yet."
      />
      <h2>If we did it again</h2>
      <Items
        values={reflection?.ifAgain}
        empty="No restart suggestions shared yet."
      />
      <h2>What you can reuse</h2>
      {reflection?.reusable.length ? (
        <div className="reusable-grid">
          {reflection.reusable.map((v, i) => (
            <div className="problem-box" key={i}>
              <h3>{v.label}</h3>
              {v.url ? (
                <a
                  className="text-link"
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open material ↗
                </a>
              ) : (
                <p className="metadata">No link provided.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="subtle-empty">No reusable materials shared yet.</p>
      )}
    </section>
  );
}
function RelayActions({ projectId, status }: { projectId: string; status: string }) {
  const { user } = useIdentity();
  if (user?.role === "staff" || user?.role === "mentor")
    return (
      <section className="panel contextual-panel">
        <p className="eyebrow">Mentor connections</p>
        <h3>{user.role === "staff" ? "Bring the right mentor into a question." : "Help a team with a concrete question."}</h3>
        <p>
          {user.role === "staff"
            ? "Questions that ask for a mentor wait in your workbench until you refer one. Each question can be referred once."
            : "Questions Staff refer to you appear in your workbench. Your replies there are marked as referred mentor replies."}
        </p>
        <Link href="/workspace" className="button secondary">
          Open my workbench
        </Link>
      </section>
    );
  if (status === "ongoing")
    return (
      <section className="panel contextual-panel">
        <p className="eyebrow">Next connections</p>
        <h3>Bring the right people into the project.</h3>
        <p>Ask a specific question below. Ongoing projects can be picked up once they are Finished or Paused.</p>
      </section>
    );
  return (
    <section className="panel contextual-panel">
      <p className="eyebrow">Next connections</p>
      <h3>{status === "paused" ? "A pause can be a starting point." : "Leave a place for the next team."}</h3>
      <p>Reproduce a result, continue unfinished work, or improve one part. You start your own Ongoing project; this one stays as it is.</p>
      {user?.role === "student" && (
        <Link href={`/projects/${projectId}/pick-up`} className="button primary">
          Pick up this project
        </Link>
      )}
    </section>
  );
}
export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { userId, user, users } = useIdentity();
  const { data, error, loading, reload } = useResource<RelayProjectDetail>(
    `/projects/${id}`,
    userId,
  );
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    try {
      const message = sessionStorage.getItem(flashKey);
      if (message) {
        sessionStorage.removeItem(flashKey);
        setSuccess(message);
      }
    } catch {}
  }, []);
  if (loading && !data) return <Loading />;
  if (!data) return <Feedback error={error} />;
  const { project: p, lessons, source, successors } = data;
  const owner = users.find((u) => u.id === p.ownerId);
  const mine = user?.role === "student" && p.ownerId === userId;
  return (
    <div className="project-detail">
      <Link href="/" className="breadcrumb">
        ← Explore projects
      </Link>
      <div className="project-title-row">
        <Status status={p.status} />
        <span className="metadata">
          {p.courseOrClub} · {p.term}
        </span>
      </div>
      <PageHeading
        title={p.title}
        description={p.summary}
        action={
          mine && !editing ? (
            <button
              className="button secondary"
              onClick={() => {
                setEditing(true);
                setSuccess("");
              }}
            >
              Edit project
            </button>
          ) : undefined
        }
      />
      <div className="project-meta-bar">
        <span className="author-line">
          <span className="avatar small">{owner?.name.charAt(0) || "S"}</span>
          Shared by <strong>{owner?.name || "Student team"}</strong>
        </span>
        <div className="inline-actions">
          {p.demoUrl && (
            <a
              href={p.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
            >
              View demo ↗
            </a>
          )}
          {p.codeUrl && (
            <a
              href={p.codeUrl}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
            >
              View code ↗
            </a>
          )}
        </div>
      </div>
      <Tags tags={p.tags} />
      {source && <SourceLine source={source} />}
      <Feedback error={error} success={success} />
      {editing ? (
        <div className="project-editor-wrap">
          <ProjectForm
            project={p}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              await reload();
              setEditing(false);
              setSuccess(
                "Project saved. Your earlier reflections and historical records are kept.",
              );
            }}
          />
        </div>
      ) : (
        <div className="detail-grid">
          <div>
            <Reflections
              status={p.status}
              reflection={p.reflection}
              summary={p.summary}
            />
            {p.reflection === null && lessons.length > 0 && (
              <section className="section-block">
                <h2>Historical experience</h2>
                <p className="muted">
                  Earlier lessons from this project, kept in their original
                  form.
                </p>
                {lessons.map((l) => (
                  <article className="problem-box" key={l.id}>
                    <h3>{l.title}</h3>
                    <dl className="reflection-steps">
                      <dt>We assumed</dt>
                      <dd>{l.assumed}</dd>
                      <dt>What happened</dt>
                      <dd>{l.happened}</dd>
                      <dt>We changed</dt>
                      <dd>{l.change}</dd>
                    </dl>
                    <p className="metadata">Applies when: {l.conditions}</p>
                    {l.artifacts.length > 0 && (
                      <div className="inline-actions">
                        {l.artifacts.map((artifact) => (
                          <a
                            key={artifact.url}
                            className="text-link"
                            href={artifact.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {artifact.label} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}
            {mine && <IntroductionPanel key={p.updatedAt} projectId={p.id} />}
            <ProjectQuestions projectId={p.id} projectOwnerId={p.ownerId} status={p.status} />
            <Successors successors={successors} />
          </div>
          <aside>
            <PriorityPanel
              key={p.updatedAt}
              projectId={p.id}
              isOwner={mine}
              onEdit={() => {
                setEditing(true);
                setSuccess("");
              }}
            />
            <RelayActions projectId={p.id} status={p.status} />
            <div className="panel contextual-panel">
              <h3>Your project keeps its history.</h3>
              <p>
                Switching between Ongoing, Finished, and Paused changes what
                readers see first. Saved reflections and earlier records stay
                with the project.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
