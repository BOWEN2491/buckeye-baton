"use client";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/shared/types";
import { useResource } from "@/lib/client";
import { useIdentity, Icon } from "@/components/app-shell";
import {
  Empty,
  Feedback,
  Loading,
  PageHeading,
  ProjectCard,
} from "@/components/ui";
export default function Explore() {
  const { user } = useIdentity();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = new URLSearchParams({ q, ...(status ? { status } : {}) });
  const { data, error, loading } = useResource<Project[]>(`/projects?${query}`);
  return (
    <div className="explore-layout">
      <section>
        <PageHeading
          title="Explore projects"
          description="See what teams built, what they learned, and where the next team could begin."
          action={
            user?.role === "student" ? (
              <Link href="/projects/new" className="button primary">
                <Icon name="plus" />
                New project
              </Link>
            ) : undefined
          }
        />
        <div className="search-box">
          <Icon name="search" />
          <input
            aria-label="Search projects"
            placeholder="Search project titles or descriptions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filter-bar">
          <div className="filter-buttons" aria-label="Project status filters">
            {["", "ongoing", "finished", "paused"].map((s) => (
              <button
                key={s}
                aria-pressed={status === s}
                className={status === s ? "selected" : ""}
                onClick={() => setStatus(s)}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All projects"}
              </button>
            ))}
          </div>
          <span className="result-count">{data?.length ?? "—"} projects</span>
        </div>
        <Feedback error={error} />
        {loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="project-grid">
            {data.map((p) => (
              <ProjectCard key={p.id} project={p} />
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
          <h2>A starting point for the next team</h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <h3>Explore the project</h3>
                <p>
                  Understand the goal, the progress, and the people it was built
                  for.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Learn from the team</h3>
                <p>
                  Read what worked, what changed, and what they would try again.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Find your next step</h3>
                <p>
                  Pick up a Finished or Paused project, or ask a question.
                  Staff can refer a mentor to it.
                </p>
              </div>
            </li>
          </ol>
        </div>
        <div className="starting-panel">
          <Icon name="relay" size={26} />
          <h3>Good work travels.</h3>
          <p>Your project can leave someone else a better place to begin.</p>
        </div>
        <p className="aside-footnote">
          Fictional demo projects for the OSU community.
        </p>
      </aside>
    </div>
  );
}
