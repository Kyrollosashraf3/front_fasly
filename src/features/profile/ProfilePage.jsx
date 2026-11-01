import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { AuthAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { RoleBadge } from '../../components/ui/Badge'
import { DetailRow } from '../../components/ui/Bits'
import { ImportResult } from '../../components/ui/ImportResult'
import { AccountsSection } from './AccountsSection'
import { MyProfileDialog } from './MyProfileDialog'
import { MyRecordCard } from './MyRecordCard'
import { UserDialog } from './UserDialog'
import { handleOf } from './accountHelpers'
import { useAccounts } from './useAccounts'
import './profile.css'

/**
 * ProfilePage — who am I, my own servant data, my password, and (for managers)
 * every login.
 */
export default function ProfilePage() {
  usePageTitle('الحساب')
  const { user, can, isSuperAdmin, classes, classLabel, refreshUser } = useAuth()
  const toast = useToast()

  const isMgr = can.manageAccounts(user)
  const accounts = useAccounts(isMgr)
  const { teachers, boys, refetchUsers, linked, dialog, setDialog, importResult, setImportResult } = accounts

  // Only a login attached to a servant has a record of his own to show.
  const hasRecord = Boolean(user?.teacher_id)
  const {
    data: myRecord,
    loading: myLoading,
    error: myError,
    refetch: refetchMyRecord,
  } = useQuery(() => TeacherAPI.me(), [hasRecord], { enabled: hasRecord })

  const [editing, setEditing] = useState(false)

  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return toast.error('كلمة المرور 8 حروف على الأقل.')
    setPwBusy(true)
    try {
      await AuthAPI.updateUser(user.id, { password: pw })
      setPw('')
      toast.success('تم تحديث كلمة المرور.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">الحساب</h1>
          <div className="page-head__sub">{handleOf(user)}</div>
        </div>
      </div>

      <div className="card-grid profile-grid">
        <div className="card">
          <h3 className="card__title">الملف الشخصي</h3>
          <div className="details">
            <DetailRow label="الاسم">{user?.display_name || '—'}</DetailRow>
            <DetailRow label="رقم التليفون">{user?.phone || '—'}</DetailRow>
            <DetailRow label="الصلاحية">
              <RoleBadge role={user?.role} />
            </DetailRow>
            <DetailRow label="المسند إليه">{linked(user)}</DetailRow>
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">تغيير كلمة المرور</h3>
          <form className="stack" onSubmit={changePassword}>
            <Field label="كلمة المرور الجديدة" hint="8 حروف على الأقل" htmlFor="pw-new">
              <Input
                id="pw-new"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="secondary" loading={pwBusy} icon={<Icon name="shield" size={16} />}>
              تحديث كلمة المرور
            </Button>
          </form>
        </div>
      </div>

      {hasRecord && (
        <MyRecordCard
          record={myRecord}
          loading={myLoading}
          error={myError}
          onRetry={refetchMyRecord}
          onEdit={() => setEditing(true)}
        />
      )}

      {isMgr && <AccountsSection accounts={accounts} classes={classes} />}

      <MyProfileDialog
        record={editing ? myRecord : null}
        phone={user?.phone}
        classLabel={myRecord?.class_id ? classLabel(myRecord.class_id) : 'كل الفصول'}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          refetchMyRecord()
          // The account name is read from this row, so the header needs a refresh.
          refreshUser()
        }}
      />

      <UserDialog
        target={dialog}
        teachers={teachers}
        boys={boys}
        canSuper={isSuperAdmin}
        classLabel={classLabel}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null)
          refetchUsers()
        }}
      />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="الحسابات"
      />
    </>
  )
}
