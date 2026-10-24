import Link from "next/link";
import type { Project, Lesson } from "@/shared/types";
import { readable } from "@/lib/client";
import { Icon } from "./app-shell";
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          {success}
        </div>
      )}
    </>
  );
}
export function Loading() {
  return (
    <div className="empty-state" role="status">
      <span className="spinner" />
      Loading the relay…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon name="book" size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Status({ status }: { status: string }) {
  return (
    <span className={`status ${status}`}>
      <span />
      {readable(status)}
    </span>
  );
}
export function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card">
      <div className="card-top">
        <Status status={project.status} />
        <Link
          href={`/projects/${project.id}`}
          className="quiet-link"
          aria-label={`View ${project.title}`}
        >
          View <Icon name="arrow" size={16} />
        </Link>
      </div>
      <h2>
        <Link href={`/projects/${project.id}`}>{project.title}</Link>
      </h2>
      <p className="metadata">
        {project.courseOrClub} <span>·</span> {project.term}
      </p>
      <p className="card-summary">{project.summary}</p>
      <div className="card-highlight">
        <strong>
          {project.status === "finished"
            ? "Outcome"
            : project.status === "paused"
              ? "Why we paused"
              : "Progress"}
        </strong>
        <p>
          {(project.status === "finished"
            ? project.reflection?.outcomes[0]
            : project.status === "paused"
              ? project.reflection?.whyPaused
              : project.reflection?.progress) ||
            "The team has not shared this update yet."}
        </p>
      </div>
      <Tags tags={project.tags} />
      <div className="card-footer">
        <Icon name="book" size={17} />
        <span>
          {project.status === "finished"
            ? "Read the team’s reflections"
            : project.status === "paused"
              ? "Find a place to continue"
              : "See the current progress"}
        </span>
        <span className="footer-arrow">↗</span>
      </div>
    </article>
  );
}
export function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link href={`/lessons/${lesson.id}`} className="lesson-card">
      <span className={`lesson-type ${lesson.type}`}>
        {lesson.type === "worked"
          ? "What worked"
          : lesson.type === "pitfall"
            ? "A lesson from a setback"
            : "For the next team"}
      </span>
      <h3>{lesson.title}</h3>
      <p>{lesson.happened}</p>
      <div className="quiet-link">
        Read the lesson <Icon name="arrow" size={16} />
      </div>
    </Link>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
