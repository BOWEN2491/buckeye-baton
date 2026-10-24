"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Discussion, Lesson, Project } from "@/shared/types";
import { api, useResource } from "@/lib/client";
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
  const [entries, setEntries] = useState<
    { lesson: Lesson; discussion: Discussion }[]
  >([]);
  const [discussionError, setDiscussionError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    if (user?.role === "student") return;
    setPending(true);
    setDiscussionError("");
    void api<Lesson[]>("/lessons", userId)
      .then(async (lessons) =>
        Promise.all(
          lessons.map(async (lesson) => ({
            lesson,
            discussion: await api<Discussion>(
              `/lessons/${lesson.id}/comments`,
              userId,
            ),
          })),
        ),
      )
      .then((items) => {
        if (active) setEntries(items);
      })
      .catch((e) => {
        if (active) setDiscussionError(e.message);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [userId, user?.role]);
  const myProjects = projects.filter((p) => p.ownerId === userId);
  const questions = entries.flatMap(({ lesson, discussion }) =>
    discussion.comments
      .filter(
        (c) =>
          c.kind === "question" &&
          (user?.role === "staff" ||
            discussion.referrals.some(
              (r) =>
                r.questionCommentId === c.id &&
                r.mentorId === userId &&
                r.status === "pending",
            )),
      )
      .map((comment) => ({ lesson, discussion, comment })),
  );
  return (
    <div>
      <PageHeading
        title={
          user?.role === "staff"
            ? "Make the right connection"
            : user?.role === "mentor"
              ? "A little guidance goes a long way"
              : "My workspace"
        }
        description={
          user?.role === "staff"
            ? "Find a focused question. Connect the person who can help."
            : user?.role === "mentor"
              ? "Your introductions, with the context you need to be useful."
              : "Your projects, your discoveries, and the next team’s starting point."
        }
        action={
          user?.role === "student" ? (
            <Link href="/projects/new" className="button primary">
              + New project
            </Link>
          ) : undefined
        }
      />
      <Feedback error={error || discussionError} />
      {loading || pending ? (
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
        <>
          <div className="section-heading">
            <h2>
              {user?.role === "staff"
                ? "Questions from the community"
                : "Introductions awaiting your response"}
            </h2>
            <span className="count-badge">{questions.length}</span>
          </div>
          {questions.length ? (
            <div className="work-list">
              {questions.map(({ lesson, comment, discussion }) => (
                <article className="panel work-item" key={comment.id}>
                  <div className="metadata">
                    {comment.author.name} · Student question
                  </div>
                  <h3>{comment.body}</h3>
                  <p>
                    From the lesson: <strong>{lesson.title}</strong>
                  </p>
                  {discussion.referrals
                    .filter((r) => r.questionCommentId === comment.id)
                    .map((r) => (
                      <div className="referral-note" key={r.id}>
                        <div>
                          <strong>
                            {r.staff.name} → {r.mentor.name}
                          </strong>
                          <p>{r.reason}</p>
                          <span className="metadata">
                            {r.status === "completed"
                              ? "Responded"
                              : "Awaiting response"}
                          </span>
                        </div>
                      </div>
                    ))}
                  <Link
                    className="button secondary"
                    href={`/lessons/${lesson.id}#discussion`}
                  >
                    {user?.role === "staff"
                      ? "Read context & connect mentor"
                      : "Read context & respond"}{" "}
                    →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title={
                user?.role === "staff"
                  ? "No questions waiting yet"
                  : "You’re all caught up"
              }
            >
              {user?.role === "staff"
                ? "Questions will appear here when students start a discussion."
                : "New introductions will appear here with a question and the reason you were connected."}
            </Empty>
          )}
        </>
      )}
      <div className="workspace-note">
        <strong>Demo workspace</strong>
        <p>
          Use the identity selector to follow the same story as Alex, Mia,
          Sarah, and Kevin. This role switcher is for the demonstration, not
          real authentication.
        </p>
      </div>
    </div>
  );
}
