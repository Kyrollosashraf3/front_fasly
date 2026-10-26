import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useQuery } from '../../hooks'
import { GroupAPI } from '../../lib/endpoints'

/**
 * useGroups — data and actions behind the /groups picker board.
 *
 *   servants[]  one per servant in the class (boys may be empty)
 *   active      the servant whose group is open, or null
 *   unassigned  boys who are in no group yet
 *
 * A boy may sit in exactly one group, so every action is a single
 * assign / unassign call followed by a refetch.
 */
export function useGroups() {
  const { user, can, classes, classReady } = useAuth()
  const toast = useToast()

  const canWrite = can.writeGroups(user)

  const [classId, setClassId] = useState('')
  const [activeId, setActiveId] = useState('')
  const [busyId, setBusyId] = useState(null)

  const effectiveClassId = classId || (classReady && classes[0] ? String(classes[0].id) : '')

  // The board always shows one class; keep the picker on the first until it
  // is changed (or the remembered class disappears).
  useEffect(() => {
    if (!classReady || !classes.length) return
    if (!classId || !classes.some((c) => String(c.id) === String(classId))) {
      setClassId(String(classes[0].id))
    }
  }, [classReady, classes, classId])

  // A servant belongs to one class, so a class switch closes his group.
  useEffect(() => {
    setActiveId('')
  }, [effectiveClassId])

  const { data, loading, error, refetch } = useQuery(
    () => GroupAPI.list(effectiveClassId ? { class_id: effectiveClassId } : {}),
    [effectiveClassId],
    { enabled: Boolean(classReady && effectiveClassId) },
  )

  const servants = useMemo(
    () =>
      (data?.groups || []).map((g) => ({
        id: String(g.teacher_id),
        name: g.teacher_name,
        boys: g.boys || [],
      })),
    [data],
  )

  const active = servants.find((s) => s.id === activeId) || null
  const unassigned = data?.unassigned || []

  /** One mutation at a time: keeps double clicks from racing each other. */
  const run = async (boy, action, message) => {
    if (!canWrite || busyId != null) return false
    setBusyId(boy.boy_id)
    try {
      const res = await action()
      toast.success(message(res))
      refetch()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setBusyId(null)
    }
  }

  /** Add an unassigned boy to a servant's group. */
  const assign = (boy, teacherId) =>
    run(
      boy,
      () => GroupAPI.assign(Number(teacherId), [boy.boy_id]),
      (res) => `اتضاف ${boy.boy_name} لمجموعة ${res.teacher_name}.`,
    )

  /** Take a boy out of his group only — the boy row itself is untouched. */
  const remove = (boy) =>
    run(
      boy,
      () => GroupAPI.unassign([boy.boy_id]),
      () => `${boy.boy_name} بقى بدون مجموعة.`,
    )

  /** Move a boy straight from one servant to another. */
  const move = (boy, teacherId) =>
    run(
      boy,
      () => GroupAPI.assign(Number(teacherId), [boy.boy_id]),
      (res) => `اتنقل ${boy.boy_name} لمجموعة ${res.teacher_name}.`,
    )

  return {
    classes,
    canWrite,
    classId: effectiveClassId,
    setClassId,
    data,
    loading,
    error,
    refetch,
    servants,
    active,
    activeId,
    setActiveId,
    unassigned,
    busyId,
    assign,
    remove,
    move,
  }
}
