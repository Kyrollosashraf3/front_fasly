import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'

/** Query, filters and dialogs for the servants list page. */
export function useTeachersList() {
  const { classLabel, can, user, isServant } = useAuth()
  const { classId, multi, classes, picked, setPicked } = useClassScope()
  const toast = useToast()
  const modal = useModal()

  const allClasses = !classId
  const label = allClasses ? 'كل الفصول' : classLabel(classId)

  const canWrite = can.writeDirectory(user)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const debounced = useDebounced(search, 220)

  const { data: teachers, loading, error, refetch } = useQuery(
    () => TeacherAPI.list({ class_id: classId || undefined }),
    [classId],
  )

  const rows = useMemo(() => {
    const q = normalizeSearch(debounced)
    return (teachers || []).filter(
      (t) =>
        !q ||
        normalizeSearch(t.teacher_name).includes(q) ||
        normalizeSearch(t.phone).includes(q) ||
        normalizeSearch(t.phone_2).includes(q) ||
        normalizeSearch(t.zone).includes(q) ||
        normalizeSearch(t.address).includes(q),
    )
  }, [teachers, debounced])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (teacher) => {
    setEditing(teacher)
    setFormOpen(true)
  }

  const remove = async (teacher) => {
    const ok = await modal.confirm({
      title: `حذف "${teacher.teacher_name}"؟`,
      message: 'لو الخادم عنده افتقاد أو متابعة مسجّلة، السيرفر هيرفض الحذف.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await TeacherAPI.remove(teacher.id)
      toast.success('تم حذف الخادم.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return {
    classLabel,
    classId,
    multi,
    classes,
    picked,
    setPicked,
    toast,
    allClasses,
    label,
    canWrite,
    isServant,
    search,
    setSearch,
    formOpen,
    setFormOpen,
    editing,
    importResult,
    setImportResult,
    teachers,
    loading,
    error,
    refetch,
    rows,
    openCreate,
    openEdit,
    remove,
  }
}
