"use client";
import Link from "next/link";
import { useState } from "react";
import type { Project, Lesson } from "@/shared/types";
import { useResource } from "@/lib/client";
import { Icon } from "@/components/app-shell";
import {
  Empty,
  Feedback,
  LessonCard,
  Loading,
  PageHeading,
  ProjectCard,
} from "@/components/ui";
export default function Explore() {
  const [tab, setTab] = useState("projects");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = new URLSearchParams({
    q,
    ...(status && tab === "projects" ? { status } : {}),
  });
  const { data, error, loading } = useResource<Project[] | Lesson[]>(
    `/${tab}?${query}`,
  );
  return (
    <div className="explore-layout">
      <section>
        <PageHeading
          title="Explore projects"
          description="Start with what the last team learned."
          action={
            <Link href="/projects/new" className="button primary">
              <Icon name="plus" />
              New project
            </Link>
          }
        />
        <div className="search-box">
          <Icon name="search" />
          <input
            aria-label="Search projects or lessons"
            placeholder={
              tab === "projects"
                ? "Search projects, topics, or teams…"
                : "Search lessons and lessons learned…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd>⌕</kbd>
        </div>
        <div className="tabs" role="tablist" aria-label="Explore content">
          {["projects", "lessons"].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "projects" ? "Projects" : "Lessons"}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <div className="filter-buttons">
            {tab === "projects" ? (
              ["", "ongoing", "finished", "paused"].map((s) => (
                <button
                  key={s}
                  className={status === s ? "selected" : ""}
                  onClick={() => setStatus(s)}
                >
                  {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All projects"}
                </button>
              ))
            ) : (
              <span className="metadata">Experience you can build on</span>
            )}
          </div>
          <span className="result-count">
            {data?.length ?? "—"} {tab}
          </span>
        </div>
        <Feedback error={error} />
        {loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="project-grid">
            {tab === "projects"
              ? (data as Project[]).map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))
              : (data as Lesson[]).map((l) => (
                  <LessonCard key={l.id} lesson={l} />
                ))}
          </div>
        ) : (
          !error && (
            <Empty title="No matches yet">
              Try another topic or share the first project.
            </Empty>
          )
        )}
      </section>
      <aside className="explore-aside">
        <div className="relay-panel">
          <h2>How the relay works</h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <h3>Read a lesson</h3>
                <p>
                  See what the last team tried, what worked, and what didn’t.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Ask a better question</h3>
                <p>
                  Bring your context. Connect with people who can help you move
                  forward.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Try it and pass it on</h3>
                <p>
                  Apply what you learn, share the result, and leave a starting
                  point.
                </p>
              </div>
            </li>
          </ol>
        </div>
        <div className="starting-panel">
          <Icon name="relay" size={26} />
          <h3>Good work travels.</h3>
          <p>
            A setback, a small discovery, a better approach. Your experience
            could be another team’s next step.
          </p>
          <Link href="/projects/new" className="text-link">
            Share your project <Icon name="arrow" size={16} />
          </Link>
        </div>
        <p className="aside-footnote">
          Built for the OSU community.
          <br />
          Connected by shared experience.
        </p>
      </aside>
    </div>
  );
}
