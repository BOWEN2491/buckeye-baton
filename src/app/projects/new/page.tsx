import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
export default function NewProject() {
  return (
    <div className="narrow-page">
      <Link className="breadcrumb" href="/">
        ← Explore projects
      </Link>
      <PageHeading
        title="Leave a starting point"
        description="Start an Ongoing project. Add your progress and team reflections as you go."
      />
      <ProjectForm />
    </div>
  );
}
