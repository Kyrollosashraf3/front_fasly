import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useDebounced, useQuery } from '../../hooks'
import { AuthAPI, BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { accountName, attachedBoy, attachedTeacher, handleOf, linkedLabel } from './accountHelpers'

/** The manager-only «الحسابات» data: people, logins, filters and actions. */
export function useAccounts(isMgr) {
  const { user, classLabel } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const [dialog, setDialog] = useState(null) // null | 'new' | user object
  const [importResult, setImportResult] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  // '' | 'active' (مفعل) | 'pending' (بانتظار التسجيل)
  const [statusFilter, setStatusFilter] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  // '' (بدون ترتيب) | 'asc' (أ - ي) | 'desc' (ي - أ)
  const [nameSort, setNameSort] = useState('')
  const debouncedName = useDebounced(nameQuery)

  const { data: people, refetch: refetchPeople } = useQuery(
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

  const teachers = useMemo(() => people?.teachers || [], [people])
  const boys = useMemo(() => people?.boys || [], [people])

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery(() => AuthAPI.users(), [isMgr], { enabled: isMgr })

  const linked = (u) => linkedLabel(teachers, boys, u, classLabel)

  /** The name shown for an account — a super admin may borrow a servant's. */
  const nameOf = (u) => accountName(teachers, boys, u) || '—'

  /** The class an account belongs to ("كل الفصول" for the global admin). */
  const classOf = (u) => {
    if (u?.role === 'super_admin') return 'كل الفصول'
    const t = attachedTeacher(teachers, u)
    const b = attachedBoy(boys, u)
    const cid = t?.class_id ?? b?.class_id
    return cid ? classLabel(cid) : '—'
  }

  const filteredUsers = useMemo(() => {
    const q = normalizeSearch(debouncedName)
    return (users || []).filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (statusFilter === 'active' && u.pending_signup) return false
      if (statusFilter === 'pending' && !u.pending_signup) return false
      if (classFilter) {
        const t = attachedTeacher(teachers, u)
        const b = attachedBoy(boys, u)
        if (String(t?.class_id ?? b?.class_id ?? '') !== String(classFilter)) return false
      }
      if (q && !normalizeSearch(accountName(teachers, boys, u)).includes(q)) return false
      return true
    })
  }, [users, roleFilter, statusFilter, classFilter, debouncedName, teachers, boys])

  const removeUser = async (u) => {
    if (u.id === user?.id) return toast.error('لا يمكنك حذف حسابك الخاص.')
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

  return {
    teachers,
    boys,
    users,
    usersLoading,
    usersError,
    refetchUsers,
    refetchPeople,
    filteredUsers,
    linked,
    nameOf,
    classOf,
    removeUser,
    dialog,
    setDialog,
    importResult,
    setImportResult,
    roleFilter,
    setRoleFilter,
    classFilter,
    setClassFilter,
    statusFilter,
    setStatusFilter,
    nameQuery,
    setNameQuery,
    nameSort,
    setNameSort,
  }
}
