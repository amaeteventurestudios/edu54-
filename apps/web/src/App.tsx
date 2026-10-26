import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Route, Routes, Navigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, get, type User } from "@/lib/api";
import { can, homePath, UserContext, useUser } from "@/lib/session";
const Assignment = lazy(() => import("@/pages/Assignment"));
const Ask = lazy(() => import("@/pages/Ask"));
const Build = lazy(() => import("@/pages/Build"));
import Home from "@/pages/Home";
import StudentHome, { PreviewHome } from "@/pages/StudentHome";
const SchoolByGrade = lazy(() => import("@/pages/School").then((m) => ({ default: m.SchoolByGrade })));
import { useBrand } from "@/lib/brand";
const Learn = lazy(() => import("@/pages/Learn"));
const Lesson = lazy(() => import("@/pages/Lesson"));
import Login from "@/pages/Login";
import { LabStatus, Settings } from "@/pages/Misc";
const Explore = lazy(() => import("@/pages/Explore"));
const Progress = lazy(() => import("@/pages/Progress"));
const AdminOverview = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminOverview })));
const AdminPeople = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminPeople })));
const AdminClasses = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminClasses })));
const AdminSafetyContacts = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminSafetyContacts })));
const AdminSettings = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminSettings })));
const AdminServices = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminServices })));
const AdminBackups = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminBackups })));
const AdminAudit = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.AdminAudit })));
const TeacherClasses = lazy(() => import("@/pages/TeacherRoster").then((m) => ({ default: m.TeacherClasses })));
const TeacherStudents = lazy(() => import("@/pages/TeacherRoster").then((m) => ({ default: m.TeacherStudents })));
const TeacherStudent = lazy(() => import("@/pages/TeacherK12").then((m) => ({ default: m.TeacherStudent })));
const TeacherResources = lazy(() => import("@/features/Documents").then((m) => ({ default: m.TeacherResources })));
const LessonBuilder = lazy(() => import("@/pages/LessonBuilder").then((m) => ({ default: m.LessonBuilder })));
const SchoolTree = lazy(() => import("@/pages/TeacherK12").then((m) => ({ default: m.SchoolTree })));
const ViewAs = lazy(() => import("@/pages/TeacherK12").then((m) => ({ default: m.ViewAs })));
const Curriculum = lazy(() => import("@/pages/Soon").then((m) => ({ default: m.Curriculum })));
import ForceChangePassword from "@/pages/ChangePassword";
const Safety = lazy(() => import("@/pages/Safety"));
const Teacher = lazy(() => import("@/pages/Teacher"));
const SubmissionReview = lazy(() => import("@/pages/Teacher").then((m) => ({ default: m.SubmissionReview })));
const TeacherAssignments = lazy(() => import("@/pages/TeacherWork").then((m) => ({ default: m.TeacherAssignments })));
const AssignmentBuilder = lazy(() => import("@/pages/TeacherWork").then((m) => ({ default: m.AssignmentBuilder })));
const TeacherPractice = lazy(() => import("@/pages/TeacherWork").then((m) => ({ default: m.TeacherPractice })));

function Landing() {
  const u = useUser();
  const { brand } = useBrand();
  return u.role === "student" ? (brand.id === "umanah" ? <Home /> : <StudentHome />) : <Navigate to={homePath(u)} replace />;
}

/** Unknown routes (and /login once signed in) go to the user's own home instead of a dead end. */
// EDU54 has its own School by Grade (/school, with level names) and band previews (/preview/:band); one student page for both
function ByBrand({ umanah, other }: { umanah: ReactNode; other: ReactNode }) { return <>{useBrand().brand.id === "umanah" ? umanah : other}</>; }
function ToStudentPage() { return <Navigate to={`/teacher/students/${useParams().id}`} replace />; }
function GoHome() { return <Navigate to={homePath(useUser())} replace />; }

function StudentOnly({ children }: { children: React.ReactNode }) {
  const u = useUser();
  return u.role === "student" ? <>{children}</> : <Navigate to={homePath(u)} replace />;
}
function StaffOnly({ children }: { children: React.ReactNode }) {       // teaching pages: anyone with the teaching permission
  return can(useUser(), "teaching") ? <>{children}</> : <Navigate to={homePath(useUser())} replace />;
}

function NeedPerm({ perm, children }: { perm: string; children: React.ReactNode }) {
  const u = useUser();
  return can(u, perm) ? <>{children}</> : <Navigate to={homePath(u)} replace />;
}

function ContactOnly({ children }: { children: React.ReactNode }) {
  const u = useUser();
  return u.is_safety_contact ? <>{children}</> : <Navigate to={homePath(u)} replace />;   // only designated safety contacts (docs/41)
}

const Attributions = lazy(() => import("@/pages/Attributions"));
// Discovery Lab: its own frame (a lab, no school navigation), the same sign-in
const DiscoveryShell = lazy(() => import("@/discovery/ui/Shell").then((m) => ({ default: m.DiscoveryShell })));
const DiscoveryHome = lazy(() => import("@/pages/Discovery").then((m) => ({ default: m.DiscoveryHome })));
const DiscoverySearch = lazy(() => import("@/pages/Discovery").then((m) => ({ default: m.DiscoverySearch })));
const DiscoveryLabPage = lazy(() => import("@/pages/Discovery").then((m) => ({ default: m.DiscoveryLabPage })));
const DiscoveryJourney = lazy(() => import("@/pages/Discovery").then((m) => ({ default: m.DiscoveryJourney })));
const DiscoveryExperiment = lazy(() => import("@/pages/DiscoveryExperiment"));

export default function App() {
  const qc = useQueryClient();
  if (window.location.pathname === "/attributions") return <Suspense fallback={null}><Attributions /></Suspense>;   // open without signing in
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<{ user: User }>("/api/auth/me"), retry: false });
  if (me.isLoading) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  if (me.error instanceof ApiError && me.error.status === 401 || !me.data) return <Login onDone={() => qc.invalidateQueries({ queryKey: ["me"] })} />;
  if (me.data.user.must_change_password) return <ForceChangePassword />;
  return (
    <UserContext.Provider value={me.data.user}>
      <Suspense fallback={<div className="p-8"><Skeleton className="h-10 w-64" /></div>}>
      <Routes>
        <Route path="discover" element={<DiscoveryShell />}>
          <Route index element={<DiscoveryHome />} />
          <Route path="search" element={<DiscoverySearch />} />
          <Route path="journey/:id" element={<DiscoveryJourney />} />
          <Route path=":labId" element={<DiscoveryLabPage />} />
          <Route path=":labId/:expId" element={<DiscoveryExperiment />} />
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<Landing />} />
          <Route path="ask" element={<StudentOnly><Ask /></StudentOnly>} />
          <Route path="learn" element={<StudentOnly><Learn /></StudentOnly>} />
          <Route path="learn/lessons/:id" element={<StudentOnly><Lesson /></StudentOnly>} />
          <Route path="assignments/:id" element={<StudentOnly><Assignment /></StudentOnly>} />
          <Route path="revision" element={<Navigate to="/learn?tab=practice" replace />} />
          <Route path="build" element={<StudentOnly><Build /></StudentOnly>} />
          <Route path="explore" element={<Explore />} />
          <Route path="progress" element={<StudentOnly><Progress /></StudentOnly>} />
          <Route path="teacher" element={<StaffOnly><Teacher /></StaffOnly>} />
          <Route path="preview/:band" element={<StaffOnly><PreviewHome /></StaffOnly>} />
          <Route path="school" element={<StaffOnly><SchoolByGrade /></StaffOnly>} />
          <Route path="school/students/:id" element={<ToStudentPage />} />
          <Route path="teacher/assignments" element={<StaffOnly><TeacherAssignments /></StaffOnly>} />
          <Route path="teacher/assignments/new" element={<StaffOnly><AssignmentBuilder /></StaffOnly>} />
          <Route path="teacher/practice" element={<StaffOnly><TeacherPractice /></StaffOnly>} />
          <Route path="teacher/revision" element={<Navigate to="/teacher/practice" replace />} />
          <Route path="teacher/assessments" element={<Navigate to="/teacher/assignments?kind=assessment" replace />} />
          <Route path="teacher/submissions/:id" element={<StaffOnly><SubmissionReview /></StaffOnly>} />
          <Route path="teacher/classes" element={<StaffOnly><TeacherClasses /></StaffOnly>} />
          <Route path="teacher/students" element={<StaffOnly><TeacherStudents /></StaffOnly>} />
          <Route path="teacher/students/:id" element={<StaffOnly><TeacherStudent /></StaffOnly>} />
          <Route path="teacher/school" element={<StaffOnly><ByBrand umanah={<SchoolTree />} other={<Navigate to="/school" replace />} /></StaffOnly>} />
          <Route path="teacher/view-as" element={<StaffOnly><ByBrand umanah={<ViewAs />} other={<Navigate to="/preview/build" replace />} /></StaffOnly>} />
          <Route path="teacher/curriculum" element={<StaffOnly><Curriculum /></StaffOnly>} />
          <Route path="teacher/resources" element={<StaffOnly><TeacherResources /></StaffOnly>} />
          <Route path="teacher/builder" element={<StaffOnly><LessonBuilder /></StaffOnly>} />
          <Route path="admin" element={<NeedPerm perm="admin.access"><AdminOverview /></NeedPerm>} />
          <Route path="admin/people" element={<NeedPerm perm="people.manage"><AdminPeople /></NeedPerm>} />
          <Route path="admin/classes" element={<NeedPerm perm="classes.manage"><AdminClasses /></NeedPerm>} />
          <Route path="admin/safety-contacts" element={<NeedPerm perm="safety.contacts"><AdminSafetyContacts /></NeedPerm>} />
          <Route path="admin/settings" element={<NeedPerm perm="school.settings"><AdminSettings /></NeedPerm>} />
          <Route path="admin/services" element={<NeedPerm perm="engines.manage"><AdminServices /></NeedPerm>} />
          <Route path="admin/backups" element={<NeedPerm perm="backups.manage"><AdminBackups /></NeedPerm>} />
          <Route path="admin/audit" element={<NeedPerm perm="audit.view"><AdminAudit /></NeedPerm>} />
          <Route path="safety" element={<ContactOnly><Safety /></ContactOnly>} />
          <Route path="status" element={<LabStatus />} />
          <Route path="settings" element={<Settings />} />
          <Route path="login" element={<GoHome />} />
          <Route path="*" element={<GoHome />} />
        </Route>
      </Routes>
      </Suspense>
    </UserContext.Provider>
  );
}
