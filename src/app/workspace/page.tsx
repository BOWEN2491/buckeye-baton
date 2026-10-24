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
import { RoleWorkbench } from "@/components/workbench";
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
        title={
          user?.role === "staff"
            ? "Staff workbench"
            : user?.role === "mentor"
              ? "Mentor workbench"
              : "My workspace"
        }
        description={
          user?.role === "staff"
            ? "Questions that ask for a mentor, and the referrals already made."
            : user?.role === "mentor"
              ? "Questions Staff referred to you. Open one to reply on the project page."
              : "Your projects, progress, and reflections for the next team."
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
      {user?.role === "staff" || user?.role === "mentor" ? (
        <RoleWorkbench role={user.role} />
      ) : loading ? (
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
      ) : null}
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
