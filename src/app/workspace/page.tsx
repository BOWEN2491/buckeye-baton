"use client";
import Link from "next/link";
import type { Project } from "@/shared/types";
import { useResource } from "@/lib/client";
import { useIdentity } from "@/components/app-shell";
import {
  Empty,
  Feedback,
  Loading,
  PageHeading,
  ProjectCard,
} from "@/components/ui";
export default function Workspace() {
  const { user, userId } = useIdentity();
  const {
    data: projects = [],
    error,
    loading,
  } = useResource<Project[]>("/projects", userId);
  const myProjects = projects.filter((p) => p.ownerId === userId);
  return (
    <div>
      <PageHeading
        title="My workspace"
        description={
          user?.role === "student"
            ? "Your projects, progress, and reflections for the next team."
            : "Project questions and mentor connections will open next round."
        }
        action={
          user?.role === "student" ? (
            <Link href="/projects/new" className="button primary">
              + New project
            </Link>
          ) : undefined
        }
      />
      <Feedback error={error} />
      {loading ? (
        <Loading />
      ) : user?.role === "student" ? (
        <>
          <div className="section-heading">
            <h2>My projects</h2>
            <span className="metadata">{myProjects.length} projects</span>
          </div>
          {myProjects.length ? (
            <div className="project-grid">
              {myProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <Empty title="Your next project starts here">
              Publish a project and share what you learn.
            </Empty>
          )}
        </>
      ) : (
        <Empty
          title={
            user?.role === "staff"
              ? "Project introductions are coming next round"
              : "Project guidance is coming next round"
          }
        >
          For now, explore the teams’ project goals, progress, and reflections.
          No project tasks have been assigned.
        </Empty>
      )}
      <div className="workspace-note">
        <strong>Demo workspace</strong>
        <p>
          Use the identity selector to explore as Alex, Mia, Sarah, and Kevin.
          This switcher is for the demonstration, not real authentication.
        </p>
      </div>
    </div>
  );
}
