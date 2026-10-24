export type Role = 'student' | 'mentor' | 'staff';
export type ProjectStatus = 'ongoing' | 'finished' | 'paused';
export type LessonType = 'worked' | 'pitfall' | 'next_team';
export type AdoptionResult = 'worked' | 'partial' | 'failed';
export interface User { id: string; name: string; role: Role; headline: string; tags: string[] }
export interface ProjectReflection { progress: string; outcomes: string[]; problems: { title: string; assumed: string; happened: string; changed: string }[]; nextTeam: string; whyPaused: string; ifAgain: string[]; reusable: { label: string; url: string | null }[] }
export interface Project { id: string; ownerId: string; title: string; summary: string; courseOrClub: string; term: string; tags: string[]; demoUrl: string | null; codeUrl: string | null; status: ProjectStatus; reflection: ProjectReflection | null; createdAt: string; updatedAt: string }
export interface Artifact { label: string; url: string }
export interface Lesson { id: string; projectId: string; authorId: string; type: LessonType; title: string; assumed: string; happened: string; change: string; conditions: string; artifacts: Artifact[]; createdAt: string; updatedAt: string }
export interface Comment { id: string; lessonId: string; authorId: string; body: string; parentId: string | null; kind: 'question' | 'comment' | 'reply'; referralId: string | null; createdAt: string }
export interface Referral { id: string; lessonId: string; questionCommentId: string; staffId: string; mentorId: string; reason: string; status: 'pending' | 'completed'; createdAt: string }
export interface Adoption { id: string; lessonId: string; adoptingProjectId: string; authorId: string; result: AdoptionResult | null; note: string; artifactUrl: string | null; createdAt: string; updatedAt: string }
export interface CommentWithAuthor extends Comment { author: User }
export interface ReferralWithPeople extends Referral { mentor: User; staff: User }
export interface AdoptionWithProject extends Adoption { project: Project; author: User }
export interface AdoptionStats { total: number; worked: number; partial: number; failed: number }
export interface AdoptedLesson { adoption: Adoption; lesson: Lesson; sourceProject: Project }
export interface ProjectDetail { project: Project; lessons: Lesson[]; downstreamAdoptions: AdoptionWithProject[]; adoptedLessons: AdoptedLesson[] }
export interface LessonDetail { lesson: Lesson; project: Project; adoptions: AdoptionWithProject[]; stats: AdoptionStats }
export interface Discussion { comments: CommentWithAuthor[]; referrals: ReferralWithPeople[] }
export type ProjectInput = Pick<Project, 'title' | 'summary' | 'courseOrClub' | 'term' | 'tags'> & Partial<Pick<Project, 'status' | 'demoUrl' | 'codeUrl'>> & { reflection?: Partial<ProjectReflection> };
export type ProjectUpdateInput = Partial<ProjectInput>;
export type LessonInput = Pick<Lesson, 'type' | 'title' | 'assumed' | 'happened' | 'change' | 'conditions' | 'artifacts'>;
export interface CommentInput { body: string; kind: 'question' | 'comment' | 'reply'; parentId?: string | null }
export interface ReferralInput { questionCommentId: string; mentorId: string; reason: string }
export interface ReferralReplyInput { body: string }
export interface AdoptionInput { adoptingProjectId: string }
export interface AdoptionUpdateInput { result: AdoptionResult; note: string; artifactUrl?: string | null }
export interface ApiSuccess<T> { data: T }
export interface ApiError { error: { code: string; message: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
