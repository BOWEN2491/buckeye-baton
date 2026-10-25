export type Role = 'student' | 'mentor' | 'staff';
export type ProjectStatus = 'ongoing' | 'finished' | 'paused';
export type LessonType = 'worked' | 'pitfall' | 'next_team';
export interface User { id: string; name: string; role: Role; headline: string; tags: string[]; expertise?: import('./p5-types').Expertise[] }
export interface ProjectReflection { progress: string; outcomes: string[]; problems: { title: string; assumed: string; happened: string; changed: string }[]; nextTeam: string; whyPaused: string; ifAgain: string[]; reusable: { label: string; url: string | null }[] }
export interface Project { introduction?: import('./p5-types').P5PublishedIntroduction | null; id: string; ownerId: string; title: string; summary: string; courseOrClub: string; term: string; tags: string[]; demoUrl: string | null; codeUrl: string | null; status: ProjectStatus; reflection: ProjectReflection | null; createdAt: string; updatedAt: string }
export interface Artifact { label: string; url: string }
export interface Lesson { id: string; projectId: string; authorId: string; type: LessonType; title: string; assumed: string; happened: string; change: string; conditions: string; artifacts: Artifact[]; createdAt: string; updatedAt: string }
export interface Comment { id: string; lessonId: string; authorId: string; body: string; parentId: string | null; kind: 'question' | 'comment' | 'reply'; referralId: string | null; createdAt: string }
export interface Referral { id: string; lessonId: string; questionCommentId: string; staffId: string; mentorId: string; reason: string; status: 'pending' | 'completed'; createdAt: string }
export interface CommentWithAuthor extends Comment { author: User }
export interface ReferralWithPeople extends Referral { mentor: User; staff: User }
export interface ProjectDetail { project: Project; lessons: Lesson[] }
export interface LessonDetail { lesson: Lesson; project: Project }
export interface Discussion { comments: CommentWithAuthor[]; referrals: ReferralWithPeople[] }
export type ProjectInput = Pick<Project, 'title' | 'summary' | 'courseOrClub' | 'term'> & Partial<Pick<Project, 'status' | 'demoUrl' | 'codeUrl'>> & { reflection?: Partial<ProjectReflection> };
export type ProjectUpdateInput = Partial<ProjectInput>;
export type LessonInput = Pick<Lesson, 'type' | 'title' | 'assumed' | 'happened' | 'change' | 'conditions' | 'artifacts'>;
export interface CommentInput { body: string; kind: 'question' | 'comment' | 'reply'; parentId?: string | null }
export interface ReferralInput { questionCommentId: string; mentorId: string; reason: string }
export interface ReferralReplyInput { body: string }
export interface ApiSuccess<T> { data: T }
export interface ApiError { error: { code: string; message: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
