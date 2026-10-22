import { Avatar } from '../ui/Avatar'
import { ROLE_LABELS } from '../../lib/roles'
import { userLabel } from '../../lib/constants'
import { classHref } from './navLinks'
import { SheetLabel, SheetLink, SheetButton } from './Sheet'

/** Shared footer: profile / account links / logout. */
export function AccountLinks({ links, onLogout, close }) {
  return (
    <>
      <SheetLabel>الحساب</SheetLabel>
      {links.map((l) => (
        <SheetLink key={l.to} {...l} onNavigate={close} />
      ))}
      <SheetButton icon="logout" label="تسجيل الخروج" onClick={onLogout} danger />
    </>
  )
}

export function HomeSheetBody({
  multi,
  globalModules,
  classModules,
  myClassId,
  analytics,
  roots,
  account,
  close,
}) {
  return (
    <>
      {multi ? (
        <>
          <SheetLabel>الوحدات</SheetLabel>
          {globalModules.map((m) => (
            <SheetLink key={m.to} {...m} onNavigate={close} />
          ))}
        </>
      ) : (
        myClassId &&
        classModules.length > 0 && (
          <>
            <SheetLabel>وحدات الفصل</SheetLabel>
            {classModules.map((m) => (
              <SheetLink
                key={m.path || 'overview'}
                to={classHref(myClassId, m.path)}
                icon={m.icon}
                label={m.label}
                end={m.end}
                onNavigate={close}
              />
            ))}
          </>
        )
      )}
      {analytics.length > 0 && (
        <>
          <SheetLabel>تحليل</SheetLabel>
          {analytics.map((m) => (
            <SheetLink key={m.to} {...m} onNavigate={close} />
          ))}
        </>
      )}
      <SheetLabel>وصول سريع</SheetLabel>
      {roots.map((l) => (
        <SheetLink key={l.to} {...l} onNavigate={close} />
      ))}
      {account}
    </>
  )
}

export function MenuSheetBody({
  multi,
  globalModules,
  roots,
  myClassId,
  single,
  isManager,
  classLinks,
  account,
  close,
}) {
  return (
    <>
      {multi ? (
        <>
          <SheetLabel>الوحدات</SheetLabel>
          {globalModules.map((m) => (
            <SheetLink key={m.to} {...m} onNavigate={close} />
          ))}
          <SheetLabel>أقسام ثابتة</SheetLabel>
          {roots.map((l) => (
            <SheetLink key={l.to} {...l} onNavigate={close} />
          ))}
        </>
      ) : myClassId ? (
        <>
          {!single && (
            <SheetLink to="/" end icon="chevronStart" label="كل الفصول" onNavigate={close} />
          )}
          <SheetLabel>إدارة الفصل</SheetLabel>
          {classLinks({ isManager }).map((l) => (
            <SheetLink
              key={l.path}
              to={classHref(myClassId, l.path)}
              icon={l.icon}
              label={l.label}
              end={l.end}
              onNavigate={close}
            />
          ))}
          <SheetLabel>أقسام ثابتة</SheetLabel>
          {roots.map((l) => (
            <SheetLink key={l.to} {...l} onNavigate={close} />
          ))}
        </>
      ) : (
        <>
          <SheetLabel>القائمة</SheetLabel>
          {roots.map((l) => (
            <SheetLink key={l.to} {...l} onNavigate={close} />
          ))}
        </>
      )}
      {account}
    </>
  )
}

export function MeSheetBody({ user, links, onLogout, close }) {
  return (
    <>
      <div className="sheet__me">
        <Avatar name={userLabel(user)} size="md" gold />
        <div className="sheet__me-text">
          <div className="sheet__me-name">{userLabel(user)}</div>
          <div className="sheet__me-role">{ROLE_LABELS[user?.role] || user?.role}</div>
        </div>
      </div>
      {links.map((l) => (
        <SheetLink key={l.to} {...l} onNavigate={close} />
      ))}
      <SheetButton icon="logout" label="تسجيل الخروج" onClick={onLogout} danger />
    </>
  )
}
