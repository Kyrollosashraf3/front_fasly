import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { BoyProfileModal } from '../boys/BoyProfile'
import { BoyNameEdit } from '../boys/BoyName'
import './reveal.css'

/**
 * RevealPage — "اكشفلي": pick a boy, open his full file since the season start.
 * The heavy lifting (season grid, notes, follow-ups) lives in BoyProfileModal.
 *
 * The class filter sits in the toolbar: a super admin chooses which class to
 * browse, everyone else quietly sees their own. The chosen class drives the boys
 * list, and picking a boy opens his file.
 */
export default function RevealPage() {
  usePageTitle('اكشفلي')
  const { isBoy, user, can } = useAuth()
  const scope = useClassScope()
  const { multi, classes, classReady, firstClassId, setPicked: setClassPicked } = scope
  // اكشفلي always needs one class: fall back to the first until picked.
  const classId = scope.classId || firstClassId

  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const boys = await BoyAPI.list(classId ? { class_id: classId } : {})
      const teachers = isBoy
        ? []
        : await TeacherAPI.list({ class_id: classId }).catch(() => [])
      return { boys, teachers }
    },
    [classId, isBoy],
    { enabled: Boolean(classReady) },
  )

  const rows = useMemo(() => {
    const all = data?.boys || []
    const q = normalizeSearch(debounced)
    if (!q) return all
    return all.filter((b) => normalizeSearch(b.boy_name).includes(q))
  }, [data, debounced])

  const showPicker = can.seeServants(user)

  /** The boy's own timeline names whoever recorded each visit. A servant only
      ever resolves himself here; a peer's name comes with the class log. */
  const nameOfTeacher = useMemo(() => {
    const byId = new Map((data?.teachers || []).map((t) => [t.id, t.teacher_name]))
    return (id) => byId.get(id)
  }, [data])

  const changeClass = (next) => {
    setClassPicked(next)
    setPicked(null)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head__sub">اختر الفصل ثم الولد لعرض ملفه كامل من بداية الموسم.</div>
        </div>
      </div>

      <Toolbar className="toolbar--scroll">
        {multi && (
          <ClassFilter value={classId} onChange={changeClass} classes={classes} />
        )}

        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />
        <ToolbarSpacer />

        <Button
          variant="primary"
          size="lg"
          disabled={!picked}
          onClick={() => setPicked({ ...picked })}
          icon={<Icon name="eye" size={16} />}
        >
          {picked ? `اكشفلي — ${picked.boy_name}` : 'اكشفلي'}
        </Button>
      </Toolbar>

      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {loading || !classId ? (
          <SkeletonRows rows={7} cols={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="eye"
            title={debounced ? 'لا توجد نتائج' : 'لا يوجد أولاد في الفصل'}
            message={
              debounced
                ? 'جرّب اسمًا آخر.'
                : 'مفيش أولاد مسجلين في الفصل ده لحد الآن.'
            }
          />
        ) : (
          <div className="reveal-grid">
            {rows.map((boy) => (
              <div
                key={boy.id}
                className={`candidate${picked?.id === boy.id ? ' is-picked' : ''}`}
              >
                <button type="button" className="candidate__pick" onClick={() => setPicked(boy)}>
                  <Avatar name={boy.boy_name} size="sm" />
                  <span className="candidate__name truncate">{boy.boy_name}</span>
                </button>
                {boy.issue_flag && <Badge kind="red" dot />}
                <BoyNameEdit
                  boy={boy}
                  classId={classId}
                  onSaved={refetch}
                  label={`تعديل بيانات ${boy.boy_name}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <p className="reveal-hint">
          <Icon name="info" size={15} />
          الافتقاد والحضور هيظهروا بالاسم والخادم المسؤول.
        </p>
      )}

      <BoyProfileModal
        open={Boolean(picked)}
        boy={picked ? { ...picked, class_id: picked.class_id || Number(classId) } : null}
        nameOfTeacher={nameOfTeacher}
        showClassHistory
        onClose={() => setPicked(null)}
      />
    </>
  )
}
