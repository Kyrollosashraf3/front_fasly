import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { BoyAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'

/** Query, filters and dialogs for the boys list page. */
export function useBoysList() {
  const { classLabel, can, user } = useAuth()
  const { classId, multi, classes, picked, setPicked } = useClassScope()
  const toast = useToast()
  const modal = useModal()

  const allClasses = !classId
  const label = allClasses ? 'كل الفصول' : classLabel(classId)

  // Staff may add/edit boys; only managers may delete or bulk-import them.
  const canManageBoys = can.writeBoys(user)
  const canWrite = can.writeDirectory(user)

  const [search, setSearch] = useState('')
  const [flag, setFlag] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const debounced = useDebounced(search, 220)

  const { data: boys, loading, error, refetch } = useQuery(
    () => BoyAPI.list({ class_id: classId || undefined }),
    [classId],
  )

  const rows = useMemo(() => {
    const q = normalizeSearch(debounced)
    return (boys || []).filter((b) => {
      if (flag === 'flagged' && !b.issue_flag) return false
      if (!q) return true
      return (
        normalizeSearch(b.boy_name).includes(q) ||
        normalizeSearch(b.phone).includes(q) ||
        normalizeSearch(b.address).includes(q) ||
        normalizeSearch(b.zone).includes(q)
      )
    })
  }, [boys, debounced, flag])

  const flaggedCount = (boys || []).filter((b) => b.issue_flag).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (boy) => {
    setEditing(boy)
    setFormOpen(true)
  }

  const remove = async (boy) => {
    const ok = await modal.confirm({
      title: `حذف "${boy.boy_name}"؟`,
      message: 'لو للولد حضور أو افتقاد مسجّل، السيرفر هيرفض الحذف.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await BoyAPI.remove(boy.id)
      toast.success('تم حذف الولد.')
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
    canManageBoys,
    canWrite,
    search,
    setSearch,
    flag,
    setFlag,
    formOpen,
    setFormOpen,
    editing,
    viewing,
    setViewing,
    importResult,
    setImportResult,
    boys,
    loading,
    error,
    refetch,
    rows,
    flaggedCount,
    openCreate,
    openEdit,
    remove,
  }
}
