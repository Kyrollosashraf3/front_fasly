import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useQuery } from '../../hooks'
import { GroupAPI } from '../../lib/endpoints'

/** Query, filters and assignment actions behind the groups page. */
export function useGroups() {
  const { user, can, classes, isSuperAdmin, classReady } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const canWrite = can.writeGroups(user)
  const showClassPicker = classes.length > 1

  const [classId, setClassId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedBoyId, setSelectedBoyId] = useState('')
  const [editing, setEditing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const effectiveClassId = classId || (classReady && classes[0] ? String(classes[0].id) : '')

  // A sheet always needs one class; keep the picker on the first until changed.
  useEffect(() => {
    if (!classReady || !classes.length) return
    if (!classId || !classes.some((c) => String(c.id) === String(classId))) {
      setClassId(String(classes[0].id))
    }
  }, [classReady, classes, classId])

  // Switching class invalidates every filter from the previous class.
  useEffect(() => {
    setSelectedTeacherId('')
    setSelectedBoyId('')
  }, [effectiveClassId])

  const { data, loading, error, refetch } = useQuery(
    () => GroupAPI.list(effectiveClassId ? { class_id: effectiveClassId } : {}),
    [effectiveClassId],
    { enabled: Boolean(classReady) },
  )

  const teachers = useMemo(
    () => (data?.groups || []).map((g) => ({ id: g.teacher_id, name: g.teacher_name })),
    [data],
  )

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes],
  )

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.name })),
    [teachers],
  )

  const boyOptions = useMemo(() => {
    const seen = new Set()
    const rows = []
    for (const g of data?.groups || []) {
      for (const b of g.boys || []) {
        const id = String(b.boy_id)
        if (seen.has(id)) continue
        seen.add(id)
        rows.push({
          value: b.boy_id,
          label: b.boy_name,
          hint: `في مجموعة: ${g.teacher_name}`,
        })
      }
    }
    for (const b of data?.unassigned || []) {
      const id = String(b.boy_id)
      if (seen.has(id)) continue
      seen.add(id)
      rows.push({ value: b.boy_id, label: b.boy_name, hint: 'بدون مجموعة' })
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label, 'ar'))
  }, [data])

  const selectedBoy = useMemo(() => {
    if (!selectedBoyId) return null
    for (const g of data?.groups || []) {
      const boy = (g.boys || []).find((b) => String(b.boy_id) === String(selectedBoyId))
      if (boy) return { ...boy, group: g.teacher_name, teacher_id: g.teacher_id, inGroup: true }
    }
    const boy = (data?.unassigned || []).find(
      (b) => String(b.boy_id) === String(selectedBoyId),
    )
    return boy ? { ...boy, group: null, teacher_id: null, inGroup: false } : null
  }, [data, selectedBoyId])

  const visibleGroups = useMemo(
    () =>
      (data?.groups || [])
        .filter((g) => {
          if (selectedTeacherId && String(g.teacher_id) !== String(selectedTeacherId)) {
            return false
          }
          if (
            selectedBoy &&
            String(selectedBoy.teacher_id ?? '') !== String(g.teacher_id)
          ) {
            return false
          }
          return true
        })
        .map((g) => ({
          ...g,
          boys: selectedBoy
            ? (g.boys || []).filter(
                (b) => String(b.boy_id) === String(selectedBoy.boy_id),
              )
            : g.boys || [],
        })),
    [data, selectedTeacherId, selectedBoy],
  )

  const unassigned = useMemo(() => {
    if (selectedBoy) return selectedBoy.inGroup ? [] : [selectedBoy]
    return data?.unassigned || []
  }, [data, selectedBoy])

  const assignGroups = useMemo(() => {
    const rows = data?.groups || []
    return selectedTeacherId
      ? rows.filter((g) => String(g.teacher_id) === String(selectedTeacherId))
      : rows
  }, [data, selectedTeacherId])

  const pickTeacher = (value) => {
    setSelectedTeacherId(value)
    if (value) setSelectedBoyId('')
  }

  const pickBoy = (value) => {
    setSelectedBoyId(value)
    if (value) setSelectedTeacherId('')
  }

  const clearFilters = () => {
    setSelectedTeacherId('')
    setSelectedBoyId('')
  }

  const toggleEditing = () => setEditing((value) => !value)

  const editGroup = (teacherId) => {
    setSelectedTeacherId(String(teacherId))
    setSelectedBoyId('')
    setEditing(true)
  }

  const assign = async (teacherId, boyIds) => {
    if (!teacherId) {
      toast.error('اختر الخادم الأول.')
      return false
    }
    if (!boyIds.length) {
      toast.error('اختار أولاد على الأقل.')
      return false
    }
    setAssigning(true)
    try {
      const res = await GroupAPI.assign(teacherId, boyIds)
      toast.success(`اتوزع ${res.assigned} على ${res.teacher_name}.`)
      refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setAssigning(false)
    }
  }

  const unassign = async (boy) => {
    const ok = await modal.confirm({
      title: `إلغاء توزيع "${boy.boy_name}"؟`,
      message: 'هيتحط في قائمة بدون مجموعة تاني.',
      confirmLabel: 'إلغاء التوزيع',
    })
    if (!ok) return
    try {
      await GroupAPI.unassign([boy.boy_id])
      toast.success('تم إلغاء التوزيع.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const unassignMany = async (boys) => {
    if (!boys.length) return
    const ok = await modal.confirm({
      title: `إلغاء توزيع ${boys.length} ولد؟`,
      message: 'هيتحطوا في قائمة بدون مجموعة تاني.',
      confirmLabel: 'إلغاء التوزيع',
    })
    if (!ok) return
    try {
      await GroupAPI.unassign(boys.map((b) => b.boy_id))
      toast.success(`اتلغى توزيع ${boys.length}.`)
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const moveBoy = async (boy, toTeacherId) => {
    if (!toTeacherId) return false
    try {
      const res = await GroupAPI.assign(Number(toTeacherId), [boy.boy_id])
      toast.success(`اتنقل ${boy.boy_name} لمجموعة ${res.teacher_name}.`)
      refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
  }

  const importFile = async (file) => {
    try {
      setImportResult(await GroupAPI.import(file))
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return {
    classes,
    classOptions,
    isSuperAdmin,
    canWrite,
    showClassPicker,
    classId,
    setClassId,
    effectiveClassId,
    selectedTeacherId,
    setSelectedTeacherId: pickTeacher,
    teacherOptions,
    selectedBoyId,
    setSelectedBoyId: pickBoy,
    boyOptions,
    selectedBoy,
    clearFilters,
    editing,
    toggleEditing,
    editGroup,
    assigning,
    viewing,
    setViewing,
    importResult,
    setImportResult,
    data,
    loading,
    error,
    refetch,
    teachers,
    assignGroups,
    unassigned,
    visibleGroups,
    assign,
    unassign,
    unassignMany,
    moveBoy,
    importFile,
  }
}
