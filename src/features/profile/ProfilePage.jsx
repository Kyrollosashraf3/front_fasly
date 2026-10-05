import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useQuery } from '../../hooks'
import { AuthAPI, BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { ROLE_OPTIONS } from '../../lib/roles'
import { isPhone, normalisePhone } from '../../lib/constants'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { Badge, RoleBadge } from '../../components/ui/Badge'
import { DetailRow, SectionTitle } from '../../components/ui/Bits'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import './profile.css'

const OWNER_ROLES = ['teacher', 'admin']
const EMPTY_USER = {
  phone: '',
  password: '',
  role: 'user',
  teacher_id: '',
  boy_id: '',
}

/** How a login is addressed: the phone he signs in with. */
const handleOf = (u) => u?.phone || '—'

/**
 * ProfilePage — who am I, my password, and (for managers) every login.
 */
export default function ProfilePage() {
  usePageTitle('الحساب')
  const { user, can, isSuperAdmin, classLabel } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [dialog, setDialog] = useState(null) // null | 'new' | user object
  const [importResult, setImportResult] = useState(null)

  const isMgr = can.manageAccounts(user)

  const { data: people } = useQuery(
    async () => {
      const [teachers, boys] = await Promise.all([
        TeacherAPI.list().catch(() => []),
        BoyAPI.list().catch(() => []),
      ])
      return { teachers, boys }
    },
    [isMgr],
    { enabled: isMgr },
  )

  const teachers = people?.teachers || []
  const boys = people?.boys || []

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery(() => AuthAPI.users(), [isMgr], { enabled: isMgr })

  const linkedLabel = (u) => {
    if (!u) return '—'
    if (u.role === 'super_admin') return 'كل الفصول'
    if (u.teacher_id) {
      const t = teachers.find((x) => x.id === u.teacher_id)
      return t ? `${t.teacher_name} — ${classLabel(t.class_id)}` : `خادم #${u.teacher_id}`
    }
    if (u.boy_id) {
      const b = boys.find((x) => x.id === u.boy_id)
      return b ? `${b.boy_name} — ${classLabel(b.class_id)}` : `ولد #${u.boy_id}`
    }
    return '—'
  }

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

  const removeUser = async (u) => {
    if (u.id === user.id) return toast.error('لا يمكنك حذف حسابك الخاص.')
    const ok = await modal.confirm({
      title: 'حذف الحساب؟',
      message: `"${handleOf(u)}" سيتم حذفه نهائيًا.`,
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await AuthAPI.deleteUser(u.id)
      toast.success('تم حذف الحساب.')
      refetchUsers()
    } catch (err) {
      toast.error(err.message)
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
            <DetailRow label="المسند إليه">{linkedLabel(user)}</DetailRow>
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

      {isMgr && (
        <section style={{ marginTop: 'var(--sp-6)' }}>
          <SectionTitle
            action={
              <div className="row" style={{ gap: 'var(--sp-2)' }}>
                <FileMenu
                  accept=".xlsx,.xlsm,.csv"
                  items={[
                    {
                      key: 'template',
                      label: 'تنزيل نموذج إكسل',
                      icon: 'download',
                      onClick: () => AuthAPI.usersTemplate(),
                    },
                    {
                      key: 'template-csv',
                      label: 'تنزيل نموذج CSV',
                      icon: 'download',
                      onClick: () => AuthAPI.usersTemplateCsv(),
                    },
                    {
                      key: 'import',
                      label: 'استيراد الحسابات',
                      icon: 'upload',
                      fileInput: true,
                      onFile: async (file) => {
                        try {
                          setImportResult(await AuthAPI.import(file))
                          refetchUsers()
                        } catch (err) {
                          toast.error(err.message)
                        }
                      },
                    },
                  ]}
                />
                <Button variant="primary" size="sm" icon={<Icon name="plus" size={16} />} onClick={() => setDialog('new')}>
                  إضافة حساب
                </Button>
              </div>
            }
          >
            الحسابات
          </SectionTitle>

          {usersLoading ? (
            <SkeletonRows rows={4} cols={4} />
          ) : usersError ? (
            <ErrorState error={usersError} onRetry={refetchUsers} />
          ) : !users?.length ? (
            <EmptyState icon="lock" title="لا توجد حسابات" message="لا توجد حسابات مسجلة بعد." />
          ) : (
            <Table
              compact
              rows={users}
              rowKey={(u) => u.id}
              columns={[
                {
                  key: 'handle',
                  label: 'رقم التليفون',
                  render: (u) => (
                    <span className="table__name">
                      <span dir="ltr">{handleOf(u)}</span>
                      {u.pending_signup && (
                        <>
                          {' '}
                          <Badge kind="gold">بانتظار التسجيل</Badge>
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'role',
                  label: 'الصلاحية',
                  width: 130,
                  render: (u) => <RoleBadge role={u.role} />,
                },
                { key: 'linked', label: 'المسند إليه', render: (u) => linkedLabel(u) },
                {
                  key: 'actions',
                  label: '',
                  width: 100,
                  align: 'end',
                  render: (u) => (
                    <div className="table__actions">
                      <IconButton
                        icon={<Icon name="edit" size={15} />}
                        label="تعديل"
                        onClick={() => setDialog(u)}
                      />
                      <IconButton
                        icon={<Icon name="trash" size={15} />}
                        label="حذف"
                        danger
                        onClick={() => removeUser(u)}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </section>
      )}

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

/* ------------------------------------------------------------- user form */

function UserDialog({ target, teachers, boys, canSuper, classLabel, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = typeof target === 'object' && target !== null
  const [form, setForm] = useState(EMPTY_USER)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!target) return
    setErrors({})
    setForm(
      isEdit
        ? {
            phone: target.phone || '',
            password: '',
            role: target.role,
            teacher_id: target.teacher_id ? String(target.teacher_id) : '',
            boy_id: target.boy_id ? String(target.boy_id) : '',
          }
        : { ...EMPTY_USER },
    )
  }, [target, isEdit])

  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((r) => r.value !== 'super_admin' || canSuper),
    [canSuper],
  )

  const role = form.role
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const ownerOptions = () => {
    if (OWNER_ROLES.includes(role)) {
      return [
        <option key="none" value="">
          — اختر الخادم —
        </option>,
        ...teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.teacher_name} ({classLabel(t.class_id)})
          </option>
        )),
      ]
    }
    if (role === 'user') {
      return [
        <option key="none" value="">
          — اختر الولد —
        </option>,
        ...boys.map((b) => (
          <option key={b.id} value={b.id}>
            {b.boy_name} ({classLabel(b.class_id)})
          </option>
        )),
      ]
    }
    return [
      <option key="none" value="">
        بدون (أدمن عام)
      </option>,
    ]
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    const phone = normalisePhone(form.phone)

    // A new account is addressed by phone; the owner sets his own password
    // later from the signup screen, so the password field stays optional.
    if (!isEdit && !phone) next.phone = 'رقم التليفون مطلوب.'
    else if (phone && !isPhone(phone)) next.phone = 'رقم التليفون غير صحيح (01xxxxxxxxx).'
    if (form.password && form.password.length < 8)
      next.password = 'كلمة المرور 8 حروف على الأقل.'
    if (OWNER_ROLES.includes(role) && !form.teacher_id) next.owner = 'اختر الخادم.'
    if (role === 'user' && !form.boy_id) next.owner = 'اختر الولد.'
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = { role }
    payload.phone = phone || null
    if (form.password) payload.password = form.password

    // The schema re-validates the owner on every update that carries `role`,
    // so both keys travel together — the unused one is explicitly null.
    if (OWNER_ROLES.includes(role)) {
      payload.teacher_id = Number(form.teacher_id)
      payload.boy_id = null
    } else if (role === 'user') {
      payload.boy_id = Number(form.boy_id)
      payload.teacher_id = null
    } else {
      payload.teacher_id = null
      payload.boy_id = null
    }

    setBusy(true)
    try {
      if (isEdit) {
        await AuthAPI.updateUser(target.id, payload)
        toast.success('تم تعديل الحساب.')
      } else {
        await AuthAPI.createUser(payload)
        toast.success('تم إنشاء الحساب.')
      }
      onSaved?.()
    } catch (err) {
      setErrors({ phone: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (!target) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'تعديل حساب' : 'إضافة حساب'}
      sub={isEdit ? handleOf(target) : 'رقم التليفون + الصلاحية والمسند إليه'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <Field
          label="رقم التليفون"
          required={!isEdit}
          htmlFor="u-phone"
          error={errors.phone}
          hint="به يسجّل الدخول ويكمل التسجيل"
        >
          <Input
            id="u-phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01012345678"
            value={form.phone}
            error={errors.phone}
            onChange={set('phone')}
          />
        </Field>

        <Field
          label="كلمة المرور"
          htmlFor="u-pass"
          error={errors.password}
          hint={isEdit ? 'اتركه فارغًا عشان تسيبها زي ما هي.' : 'اتركه فارغًا لو هيكمل التسجيل بنفسه.'}
        >
          <Input
            id="u-pass"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={set('password')}
          />
        </Field>

        <Field label="الصلاحية" htmlFor="u-role">
          <Select id="u-role" value={form.role} onChange={set('role')}>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        {OWNER_ROLES.includes(role) || role === 'user' ? (
          <Field
            label={role === 'user' ? 'الولد' : 'الخادم'}
            required
            htmlFor="u-owner"
            error={errors.owner}
          >
            <Select
              id="u-owner"
              value={role === 'user' ? form.boy_id : form.teacher_id}
              error={errors.owner}
              onChange={set(role === 'user' ? 'boy_id' : 'teacher_id')}
            >
              {ownerOptions()}
            </Select>
          </Field>
        ) : (
          <p className="small muted">الأدمن العام مسند لكل الفصول تلقائيًا.</p>
        )}

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
