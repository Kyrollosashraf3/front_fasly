import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireClass, RoleGuard } from './components/Guards'
import { AppShell } from './components/layout/AppShell'
import { Toasts } from './components/ui/Toasts'

import LoginPage from './features/auth/LoginPage'
import SignUpPage from './features/auth/SignUpPage'
import HomePage from './features/home/HomePage'
import ClassOverviewPage from './features/classes/ClassOverviewPage'
import BoysPage from './features/boys/BoysPage'
import AttendancePage from './features/attendance/AttendancePage'
import TeachersPage from './features/teachers/TeachersPage'
import TeacherCheckPage from './features/checks/TeacherCheckPage'
import FollowUpPage from './features/followup/FollowUpPage'
import GroupsPage from './features/groups/GroupsPage'
import RevealPage from './features/reveal/RevealPage'
import ProfilePage from './features/profile/ProfilePage'
import BoysDashboard from './features/dashboard/BoysDashboard'
import TeachersDashboard from './features/dashboard/TeachersDashboard'
import BirthdaysPage from './features/birthdays/BirthdaysPage'
import NotFound from './router/NotFound'

/**
 * App — HashRouter so the build is servable from any static path, plus the
 * three guards every screen leans on:
 *
 *   RequireAuth   → session restored? else /login (remembering the target)
 *   RequireClass  → this login may open /class/:id ?
 *   RoleGuard     → may this role see the screen at all?
 *
 * Everything sits under AppShell so pages only render their own body.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />

            <Route
              path="groups"
              element={
                <RoleGuard allow={(c, u) => c.seeGroups(u)}>
                  <GroupsPage />
                </RoleGuard>
              }
            />

            <Route
              path="reveal"
              element={
                <RoleGuard allow={(c, u) => c.seeReveal(u)}>
                  <RevealPage />
                </RoleGuard>
              }
            />

            <Route path="dashboard" element={<Navigate to="/dashboard/boys" replace />} />
            <Route
              path="dashboard/boys"
              element={
                <RoleGuard allow={(c, u) => c.seeBoysDashboard(u)}>
                  <BoysDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="dashboard/teachers"
              element={
                <RoleGuard allow={(c, u) => c.seeTeachersDashboard(u)}>
                  <TeachersDashboard />
                </RoleGuard>
              }
            />

            <Route
              path="birthdays"
              element={
                <RoleGuard allow={(c, u) => c.seeBirthdays(u)}>
                  <BirthdaysPage />
                </RoleGuard>
              }
            />

            <Route path="class/:classId" element={<ClassRoute><ClassOverviewPage /></ClassRoute>} />
            <Route path="class/:classId/boys" element={<ClassRoute><BoysPage /></ClassRoute>} />
            <Route path="class/:classId/attendance" element={<ClassRoute><AttendancePage /></ClassRoute>} />
            <Route path="class/:classId/followup" element={<ClassRoute><FollowUpPage /></ClassRoute>} />

            <Route
              path="class/:classId/teachers"
              element={
                <ClassRoute>
                  <RoleGuard allow={(c, u) => c.seeServants(u)}>
                    <TeachersPage />
                  </RoleGuard>
                </ClassRoute>
              }
            />

            <Route
              path="class/:classId/checks"
              element={
                <ClassRoute>
                  <RoleGuard allow={(c, u) => c.seeChecks(u)}>
                    <TeacherCheckPage />
                  </RoleGuard>
                </ClassRoute>
              }
            />

            <Route path="profile" element={<ProfilePage />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>

      <Toasts />
    </HashRouter>
  )
}

/** Applies the class-access rule to everything under /class/:classId. */
function ClassRoute({ children }) {
  return <RequireClass>{children}</RequireClass>
}
