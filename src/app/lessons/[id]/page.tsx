"use client";
import Link from "next/link";
import { use } from "react";
import type { LessonDetail } from "@/shared/types";
import { useResource } from "@/lib/client";
import { useIdentity, Icon } from "@/components/app-shell";
import { Feedback, Loading, PageHeading } from "@/components/ui";
import { Discussion } from "@/components/discussion";
import { AdoptionPanel } from "@/components/adoption-panel";
export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { userId, users } = useIdentity();
  const { data, error, loading, reload } = useResource<LessonDetail>(
    `/lessons/${id}`,
    userId,
  );
  if (loading && !data) return <Loading />;
  if (!data) return <Feedback error={error} />;
  const { lesson: l, project, adoptions } = data;
  const author = users.find((u) => u.id === l.authorId);
  return (
    <div>
      <Link href={`/projects/${project.id}`} className="breadcrumb">
        ← {project.title}
      </Link>
      <div className={`lesson-type ${l.type}`}>
        {l.type === "worked"
          ? "What worked"
          : l.type === "pitfall"
            ? "A lesson from a setback"
            : "For the next team"}
      </div>
      <PageHeading title={l.title} />
      <div className="lesson-provenance">
        <span className="avatar small">{author?.name.charAt(0) || "A"}</span>
        <span>
          Shared by <strong>{author?.name || "Student author"}</strong> from{" "}
          <Link href={`/projects/${project.id}`}>{project.title}</Link>
        </span>
        <span className="metadata">{project.term}</span>
      </div>
      <Feedback error={error} />
      <div className="detail-grid">
        <section>
          <article className="lesson-content">
            <section>
              <h2>What we expected</h2>
              <p>{l.assumed}</p>
            </section>
            <section>
              <h2>What actually happened</h2>
              <p>{l.happened}</p>
            </section>
            <section>
              <h2>What we changed</h2>
              <p>{l.change}</p>
            </section>
            <section className="conditions">
              <Icon name="book" />
              <div>
                <h3>Read the context before you reuse it</h3>
                <p>{l.conditions}</p>
              </div>
            </section>
            {l.artifacts.length > 0 && (
              <section>
                <h3>Supporting work</h3>
                <div className="inline-actions">
                  {l.artifacts.map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="button secondary"
                    >
                      {a.label} ↗
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>
          <Discussion lessonId={id} />
          <section className="section-block">
            <h2>What happened next</h2>
            <p className="muted">
              Outcomes are reported by the teams who tried this lesson.
            </p>
            {adoptions.some((a) => a.result) ? (
              adoptions
                .filter((a) => a.result)
                .map((a) => (
                  <article className="adoption-row" key={a.id}>
                    <Icon name="relay" />
                    <div>
                      <div className="result-label">
                        {a.result === "worked"
                          ? "Worked for this team"
                          : a.result === "partial"
                            ? "Adapted and used"
                            : "Didn’t fit this context"}
                      </div>
                      <Link
                        href={`/projects/${a.project.id}`}
                        className="text-link"
                      >
                        {a.project.title}
                      </Link>
                      <p>{a.note}</p>
                      <span className="metadata">
                        Reported by {a.author.name}
                      </span>
                      {a.artifactUrl && (
                        <a
                          className="text-link artifact-link"
                          href={a.artifactUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          See supporting work ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))
            ) : (
              <p className="subtle-empty">
                No outcomes reported yet. Save it, try it, and bring back what
                you learn.
              </p>
            )}
          </section>
        </section>
        <AdoptionPanel detail={data} onSaved={reload} />
      </div>
    </div>
  );
}
