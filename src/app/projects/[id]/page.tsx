"use client";
import Link from "next/link";
import { use, useState } from "react";
import type { ProjectDetail, ProjectStatus } from "@/shared/types";
import { api, useResource } from "@/lib/client";
import { useIdentity, Icon } from "@/components/app-shell";
import {
  Empty,
  Feedback,
  LessonCard,
  Loading,
  PageHeading,
  Status,
  Tags,
} from "@/components/ui";
import { LessonForm } from "@/components/lesson-form";
function BorrowedLessons({
  items,
}: {
  items: ProjectDetail["adoptedLessons"];
}) {
  if (!items?.length) return null;
  return (
    <section className="section-block">
      <h2>Lessons we’re building on</h2>
      <p className="muted">The work that gave this team a starting point.</p>
      {items.map(({ adoption, lesson, sourceProject }) => (
        <article className="adoption-row" key={adoption.id}>
          <Icon name="relay" />
          <div>
            <Link className="text-link" href={`/lessons/${lesson.id}`}>
              {lesson.title}
            </Link>
            <p className="metadata">
              From{" "}
              <Link href={`/projects/${sourceProject.id}`}>
                {sourceProject.title}
              </Link>
            </p>
            <div className="result-label">
              {adoption.result === "worked"
                ? "Worked for our team"
                : adoption.result === "partial"
                  ? "Adapted and used"
                  : adoption.result === "failed"
                    ? "Different outcome"
                    : "Saved · not yet tried"}
            </div>
            {adoption.note && <p>{adoption.note}</p>}
          </div>
        </article>
      ))}
    </section>
  );
}
export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { userId, users } = useIdentity();
  const { data, error, loading, reload } = useResource<ProjectDetail>(
    `/projects/${id}`,
    userId,
  );
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  async function status(value: ProjectStatus) {
    setBusy(true);
    setActionError("");
    try {
      await api(`/projects/${id}`, userId, { status: value }, "PATCH");
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (!data) return <Feedback error={error} />;
  const { project: p, lessons, downstreamAdoptions } = data;
  const owner = users.find((u) => u.id === p.ownerId);
  const mine = p.ownerId === userId;
  return (
    <div>
      <Link href="/" className="breadcrumb">
        ← Explore projects
      </Link>
      <div className="project-title-row">
        <Status status={p.status} />
        <span className="metadata">
          {p.courseOrClub} · {p.term}
        </span>
      </div>
      <PageHeading title={p.title} description={p.summary} />
      <div className="project-meta-bar">
        <span className="author-line">
          <span className="avatar small">{owner?.name.charAt(0) || "A"}</span>
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
      <Feedback error={error || actionError} />
      <div className="detail-grid">
        <section>
          <div className="section-heading">
            <div>
              <h2>Lessons from this project</h2>
              <p>The useful discoveries, the setbacks, and what comes next.</p>
            </div>
            {mine && (
              <button
                className="button secondary"
                onClick={() => setShowForm(!showForm)}
              >
                <Icon name="plus" size={17} />
                {showForm ? "Close form" : "Add lesson"}
              </button>
            )}
          </div>
          {showForm && (
            <LessonForm
              projectId={id}
              onSaved={() => {
                setShowForm(false);
                void reload();
              }}
            />
          )}
          <div className="lesson-list">
            {lessons.length ? (
              lessons.map((l) => <LessonCard key={l.id} lesson={l} />)
            ) : (
              <Empty title="The first lesson is still ahead">
                {mine
                  ? "Share one useful discovery to give the next team a starting point."
                  : "Check back as this team shares what they learn."}
              </Empty>
            )}
          </div>
          <BorrowedLessons items={data.adoptedLessons} />
          <section className="section-block">
            <h2>The relay continues</h2>
            <p className="muted">Where this project’s lessons went next.</p>
            {downstreamAdoptions.filter((a) => a.result).length ? (
              downstreamAdoptions
                .filter((a) => a.result)
                .map((a) => (
                  <div className="adoption-row" key={a.id}>
                    <Icon name="relay" />
                    <div>
                      <Link
                        href={`/projects/${a.project.id}`}
                        className="text-link"
                      >
                        {a.project.title}
                      </Link>
                      <p>{a.note}</p>
                      <span className="metadata">
                        {a.result === "partial"
                          ? "Adapted and used"
                          : a.result === "worked"
                            ? "Worked for this team"
                            : "Different outcome"}{" "}
                        · {a.author.name}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="subtle-empty">
                No reported outcomes yet. The next team could start here.
              </p>
            )}
          </section>
        </section>
        <aside>
          <div className="panel contextual-panel">
            <h3>
              {p.status === "ongoing"
                ? "A project in progress"
                : p.status === "paused"
                  ? "A pause is a starting point"
                  : "The work is finished. The learning isn’t."}
            </h3>
            <p>
              {p.status === "ongoing"
                ? "Read the lessons, ask a focused question, or bring a useful perspective to this team."
                : p.status === "paused"
                  ? "Look for what is reusable, why the team stopped, and what another team could try."
                  : "Build on what this team discovered, and share how it works in your own context."}
            </p>
          </div>
          {mine && (
            <div className="panel form-stack">
              <h3>Project status</h3>
              <label>
                Update progress
                <select
                  value={p.status}
                  disabled={busy}
                  onChange={(e) => void status(e.target.value as ProjectStatus)}
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="finished">Finished</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <p className="field-help">
                Your lessons and discussions stay with the project.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
