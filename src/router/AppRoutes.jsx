import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireClass, RoleGuard } from '../components/Guards'
import { AppShell } from '../components/layout/AppShell'

import LoginPage from '../features/auth/LoginPage'
import SignUpPage from '../features/auth/SignUpPage'
import HomePage from '../features/home/HomePage'
import ClassesPage from '../features/classes/ClassesPage'
import MyTripPage from '../features/myTrip/MyTripPage'
import TripActionsPage from '../features/myTrip/TripActionsPage'
import ClassOverviewPage from '../features/classes/ClassOverviewPage'
import BoysPage from '../features/boys/BoysPage'
import AttendancePage from '../features/attendance/AttendancePage'
import TeachersPage from '../features/teachers/TeachersPage'
import TeacherCheckPage from '../features/checks/TeacherCheckPage'
import FollowUpPage from '../features/followup/FollowUpPage'
import GroupsPage from '../features/groups/GroupsPage'
import RevealPage from '../features/reveal/RevealPage'
import ProfilePage from '../features/profile/ProfilePage'
import BoysDashboard from '../features/dashboard/BoysDashboard'
import FollowUpPerformancePage from '../features/followup/FollowUpPerformancePage'
import TeachersDashboard from '../features/dashboard/TeachersDashboard'
import BirthdaysPage from '../features/birthdays/BirthdaysPage'
import NotFound from './NotFound'

/** The whole route tree, under the three guards every screen leans on. */
export function AppRoutes() {
  return (
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
            path="dashboard/follow-up"
            element={
              <RoleGuard allow={(c, u) => c.seeFollowUpPerformance(u)}>
                <FollowUpPerformancePage />
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

          {/* Global modules — the super admin sees every class at once and
              scopes each page with its own in-page class filter. */}
          <Route
            path="classes"
            element={
              <RoleGuard allow={(c, u) => c.manageClasses(u)}>
                <ClassesPage />
              </RoleGuard>
            }
          />
          <Route path="trips" element={<Navigate to="/myTrip" replace />} />
          <Route
            path="myTrip"
            element={
              <RoleGuard allow={(c, u) => c.manageTrips(u)}>
                <MyTripPage />
              </RoleGuard>
            }
          />
          <Route
            path="myTrip/:tripId"
            element={
              <RoleGuard allow={(c, u) => c.manageTrips(u)}>
                <TripActionsPage />
              </RoleGuard>
            }
          />
          <Route
            path="boys"
            element={
              <RoleGuard allow={(c, u) => c.editBoys(u)}>
                <BoysPage />
              </RoleGuard>
            }
          />
          <Route
            path="attendance"
            element={
              <RoleGuard allow={(c, u) => c.writeAttendance(u)}>
                <AttendancePage />
              </RoleGuard>
            }
          />
          <Route
            path="followup"
            element={
              <RoleGuard allow={(c, u) => c.writeFollowUp(u)}>
                <FollowUpPage />
              </RoleGuard>
            }
          />
          <Route
            path="teachers"
            element={
              <RoleGuard allow={(c, u) => c.seeServants(u)}>
                <TeachersPage />
              </RoleGuard>
            }
          />
          <Route
            path="checks"
            element={
              <RoleGuard allow={(c, u) => c.seeChecks(u)}>
                <TeacherCheckPage />
              </RoleGuard>
            }
          />

          <Route path="profile" element={<ProfilePage />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}

/** Applies the class-access rule to everything under /class/:classId. */
function ClassRoute({ children }) {
  return <RequireClass>{children}</RequireClass>
}
