import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { GroupAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { SearchInput, Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'

import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import { BoyProfileModal, followLabel } from '../boys/BoyProfile'
import { BoyName } from '../boys/BoyName'
import { Avatar } from '../../components/ui/Avatar'
import { formatShort } from '../../lib/format'
import { AssignGame } from './AssignGame'
import './groups.css'

/**
 * GroupsPage — servant follow-up assignments.
 *
 * Left/top: assign panel (pick a servant, tick ungrouped boys, save).
 * Below: one card per servant with his roster + attendance + last avcation.
 */
export default function GroupsPage() {
  const { user, can, classes, isSuperAdmin, classReady } = useAuth()
  const toast = useToast()
  const modal = useModal()

  usePageTitle('المجموعات')

  const canWrite = can.writeGroups(user)
  const showClassPicker = canWrite && classes.length > 1

  const [classId, setClassId] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [boySearch, setBoySearch] = useState('')
  const [boyMove, setBoyMove] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const debounced = useDebounced(search, 200)
  const effectiveClassId = classId || classes[0]?.id || ''

  useEffect(() => {
    if (!initialized && user?.teacher_id && !selectedTeacherId) {
      setSelectedTeacherId(String(user.teacher_id))
      setInitialized(true)
    }
  }, [user, initialized, selectedTeacherId])

  const { data, loading, error, refetch } = useQuery(
    () => GroupAPI.list(effectiveClassId ? { class_id: effectiveClassId } : {}),
    [effectiveClassId],
    { enabled: Boolean(classReady) },
  )

  const teachers = useMemo(
    () => (data?.groups || []).map((g) => ({ id: g.teacher_id, name: g.teacher_name })),
    [data],
  )

  const unassigned = useMemo(() => {
    const q = normalizeSearch(debounced)
    return (data?.unassigned || []).filter((b) => {
      if (genderFilter === 'm' && b.gender !== 'm') return false
      if (genderFilter === 'f' && b.gender !== 'f') return false
      if (q && !normalizeSearch(b.boy_name).includes(q)) return false
      return true
    })
  }, [data, debounced, genderFilter])

  const visibleGroups = useMemo(() => {
    const q = normalizeSearch(debounced)
    const sel = selectedTeacherId
    return (data?.groups || [])
      .filter((g) => {
        if (sel && String(g.teacher_id) !== sel) return false
        if (!q) return true
        const hasBoyMatch = (g.boys || []).some((b) => {
          const bg = normalizeSearch(b.boy_name)
          const ok = !q || bg.includes(q)
          const gk = genderFilter
          if (gk === 'm' && b.gender !== 'm') return ok && false
          if (gk === 'f' && b.gender !== 'f') return ok && false
          return ok
        })
        const nameMatch = normalizeSearch(g.teacher_name).includes(q)
        return nameMatch || hasBoyMatch
      })
      .map((g) => ({
        ...g,
        boys: (g.boys || []).filter((b) => {
          if (genderFilter === 'm' && b.gender !== 'm') return false
          if (genderFilter === 'f' && b.gender !== 'f') return false
          if (q) return normalizeSearch(b.boy_name).includes(q)
          return true
        }),
      }))
  }, [data, selectedTeacherId, debounced, genderFilter])

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

  const moveBoy = async (boy, toTeacherId) => {
    if (!toTeacherId) return
    try {
      if (boy.inGroup) {
        await GroupAPI.unassign([boy.boy_id])
      }
      await GroupAPI.assign(Number(toTeacherId), [boy.boy_id])
      toast.success('تم نقل الولد للمجموعة بنجاح.')
      refetch()
      setBoyMove(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const boyRow = (b, withActions = true, showAssignTo = false) => (
    <tr key={b.boy_id}>
      <td>
        <BoyName boy={b} className="table__name" classId={effectiveClassId} onSaved={refetch} />
      </td>
      <td className="ltr" style={{ textAlign: 'center' }}>
        {b.phone || '—'}
      </td>
      <td>
        {b.percent !== null && b.percent !== undefined ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="group-att">
              <span className="group-att__fill" style={{ width: `${b.percent}%` }} />
            </span>
            <span className="xsmall bold nowrap">
              {b.present}/{b.total ?? b.present + b.absent} ({b.percent}%)
            </span>
          </span>
        ) : (
          <span className="muted xsmall">—</span>
        )}
      </td>
      <td>
        {b.last_followup ? (
          <span className="row" style={{ gap: 6 }}>
            <Badge kind="blue">{followLabel(b.last_followup.status)}</Badge>
            <span className="xsmall muted">{formatShort(b.last_followup.action_date)}</span>
          </span>
        ) : (
          <span className="muted xsmall">—</span>
        )}
      </td>
      <td className="muted small">{b.note || '—'}</td>
       {withActions && (
         <td>
           <div className="table__actions">
             <IconButton icon={<Icon name="eye" size={16} />} label="عرض الملف" onClick={() => setViewing(b)} />
             {canWrite && !showAssignTo && (
               <IconButton icon={<Icon name="close" size={16} />} label="إلغاء التوزيع" danger onClick={() => unassign(b)} />
             )}
           </div>
         </td>
       )}
       {showAssignTo && canWrite && (
         <td style={{ minWidth: 180 }}>
           <Select
             className="select--plain"
             onChange={(e) => {
               const tid = e.target.value
               if (tid) {
                 assign(Number(tid), [b.boy_id])
                 e.target.value = ''
               }
             }}
             style={{ width: '100%' }}
           >
             <option value="">إضافة إلى خادم: --</option>
             {(data?.groups || []).map((g) => (
               <option key={g.teacher_id} value={g.teacher_id}>
                 {g.teacher_name}
               </option>
             ))}
           </Select>
         </td>
       )}
    </tr>
  )

  const HEADERS = ['الاسم', 'التليفون', 'الحضور', 'آخر افتقاد', 'ملاحظات', '']
  const UNASSIGNED_HEADERS = ['الاسم', 'التليفون', 'الحضور', 'آخر افتقاد', 'ملاحظات', '', 'إضافة إلى خادم']

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">المجموعات</h1>
          <div className="page-head__sub">
            {data
              ? `${data.groups.length} مجموعة · ${data.unassigned_count} بدون مجموعة`
              : 'توزيع الأولاد على الخدام'}
          </div>
        </div>

        <FileMenu
          label="إكسل"
          items={[
            {
              key: 'export',
              label: 'تصدير شيت التوزيع',
              icon: 'download',
              onClick: () => GroupAPI.export(effectiveClassId),
            },
            canWrite && {
              key: 'import',
              label: 'رفع شيت توزيع',
              icon: 'upload',
              fileInput: true,
              onFile: async (file) => {
                try {
                  setImportResult(await GroupAPI.import(file))
                  refetch()
                } catch (err) {
                  toast.error(err.message)
                }
              },
            },
          ].filter(Boolean)}
        />
      </div>

      <Toolbar className="toolbar--scroll">
        <Select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="select--plain"
          style={{ minWidth: 200 }}
          aria-label="اختيار الخادم"
        >
          <option value="">اختر الخادم...</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="select--plain"
          style={{ minWidth: 110 }}
          aria-label="فلتر النوع"
        >
          <option value="all">كل الأولاد</option>
          <option value="m">ولد</option>
          <option value="f">بنت</option>
        </Select>

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />
        <div style={{ position: 'relative' }}>
          <SearchInput value={boySearch} onChange={setBoySearch} placeholder="ابحث عن ولد لمعرفة مجموعته..." />
          {boyResults.length > 0 && boySearch && (
            <div className="card" style={{ position: 'absolute', zIndex: 20, width: 320, marginTop: 6, padding: 8 }}>
              {boyResults.map((b) => (
                <div key={b.boy_id} className="row" style={{ justifyContent: 'space-between', padding: 6 }}>
                  <div>
                    <div className="small bold">{b.boy_name}</div>
                    <div className="xsmall muted">
                      {b.inGroup ? `في مجموعة: ${b.group}` : 'بدون مجموعة'}
                    </div>
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => { setBoyMove(b); setBoySearch('') }}>
                      نقل
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <ToolbarSpacer />
        {isSuperAdmin && <Badge kind="gold">أدمن عام</Badge>}
      </Toolbar>

      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

      {loading ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={6} cols={6} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          {/* ----------------------------------------------------- assign game */}
          {canWrite && (
            <AssignGame
              classes={classes}
              classId={effectiveClassId}
              classIdForEdit={effectiveClassId}
              showClassPicker={showClassPicker}
              onClassChange={setClassId}
              groups={data?.groups || []}
              boys={data?.unassigned || []}
              assigning={assigning}
              onAssign={assign}
              onSaved={refetch}
            />
          )}

          {/* --------------------------------------------------- group cards */}
          {visibleGroups.length === 0 && !unassigned.length ? (
            <EmptyState
              icon="groups"
              title="لا توجد مجموعات"
              message="وزّع الأولاد على الخدام من اللوحة فوق."
            />
          ) : (
            <div className="group-list">
              {visibleGroups.map((g) => (
                <section key={g.teacher_id} className="group-card card">
                  <div className="group-card__head">
                    <div className="row">
                      <Avatar name={g.teacher_name} size="md" />
                      <div>
                        <div className="group-card__name">{g.teacher_name}</div>
                        <div className="xsmall muted">
                          {g.phone ? <span className="ltr">{g.phone}</span> : 'بدون تليفون'}
                          {' · '}
                          {g.boys_count} ولد
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      {canWrite && g.boys.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => unassignMany(g.boys)}>
                          إلغاء الكل
                        </Button>
                      )}
                    </div>
                  </div>

                  {g.boys.length === 0 ? (
                    <div className="card__body">
                      <p className="small muted">لا يوجد أولاد في مجموعة الخادم ده.</p>
                    </div>
                  ) : (
                    <div className="table-wrap group-table">
                      <table className="table table--compact">
                        <thead>
                          <tr>
                           {UNASSIGNED_HEADERS.map((h, i) => (
                             <th key={i} style={{ textAlign: 'start' }}>
                               {h}
                             </th>
                           ))}
                          </tr>
                        </thead>
                        <tbody>{g.boys.map((b) => boyRow(b, true, false))}</tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}

              {unassigned.length > 0 && (
                <section className="group-card card group-card--empty">
                  <div className="group-card__head">
                    <div className="row">
                      <span className="group-card__icon">
                        <Icon name="boys" size={20} />
                      </span>
                      <div>
                        <div className="group-card__name">بدون مجموعة</div>
                        <div className="xsmall muted">{unassigned.length} ولد لسه ماتوزّعوش</div>
                      </div>
                    </div>
                  </div>
                  <div className="table-wrap group-table">
                    <table className="table table--compact">
                      <thead>
                        <tr>
                          {HEADERS.map((h, i) => (
                            <th key={i} style={{ textAlign: 'start' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                       <tbody>
                         {unassigned.map((b) => boyRow(b, true, true))}
                       </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      <BoyProfileModal
        open={Boolean(viewing)}
        // group rows carry `boy_id`; the profile modal (and its dashboard
        // history request) wants the plain `id`.
        boy={viewing ? { ...viewing, id: viewing.boy_id, class_id: viewing.class_id ?? Number(effectiveClassId) } : null}
        onClose={() => setViewing(null)}
      />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="التوزيع"
      />

      {boyMove && (
        <div className="modal-overlay" onClick={() => setBoyMove(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal__head">
              <div>
                <div className="modal__title">نقل {boyMove.boy_name}</div>
                <div className="modal__sub">
                  {boyMove.inGroup ? `حالياً في مجموعة: ${boyMove.group}` : 'حالياً بدون مجموعة'}
                </div>
              </div>
              <button className="modal__close" onClick={() => setBoyMove(null)}>×</button>
            </div>
            <div className="modal__body">
              <Select
                onChange={(e) => {
                  const tid = e.target.value
                  if (tid) moveBoy(boyMove, tid)
                }}
              >
                <option value="">اختر الخادم لنقله له...</option>
                {teachers
                  .filter((t) => !boyMove.inGroup || String(t.id) !== String(boyMove.teacher_id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
