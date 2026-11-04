import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useClassScope, useDebounced, useQuery } from '../../hooks'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { normalizeSearch } from '../../lib/search'
import { classesForStage, stageLabel } from '../../lib/stages'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { StageSelect } from '../../components/ui/StageSelect'
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
  const { isBoy, user, can, isSuperAdmin } = useAuth()
  const scope = useClassScope()
  const { multi, classes, classReady, firstClassId, setPicked: setClassPicked } = scope
  // اكشفلي always needs one class: fall back to the first until picked.
  const classId = scope.classId || firstClassId

  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)

  // A stage choice narrows the class menu and, with no class picked, applies
  // itself to the whole page: the candidates of every class of the stage.
  const [stage, setStage] = useState('')
  const visibleClasses = useMemo(() => classesForStage(classes, stage), [classes, stage])
  const stageIds = stage && !scope.classId ? visibleClasses.map((c) => c.id) : []
  const pickStage = (next) => {
    setStage(next)
    setClassPicked('')
    setPicked(null)
  }

  const debounced = useDebounced(search, 200)

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const ids = stageIds.length ? stageIds : [classId]
      const boys = (
        await Promise.all(ids.map((id) => BoyAPI.list({ class_id: id })))
      ).flat()
      const teachers = isBoy
        ? []
        : (
            await Promise.all(
              ids.map((id) => TeacherAPI.list({ class_id: id }).catch(() => [])),
            )
          ).flat()
      return { boys, teachers }
    },
    [classId, stageIds.join(','), isBoy],
    { enabled: Boolean(classReady) },
  )

  const rows = useMemo(() => {
    const all = data?.boys || []
    const q = normalizeSearch(debounced)
    if (!q) return all
    return all.filter((b) => normalizeSearch(b.boy_name).includes(q))
  }, [data, debounced])

  const showPicker = can.seeServants(user)

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
          <div className="stage-filters">
            <ClassFilter
              value={stage && !scope.classId ? '' : classId}
              onChange={changeClass}
              classes={visibleClasses}
              allLabel={stage ? `كل ${stageLabel(stage)}` : undefined}
            />
            {isSuperAdmin && <StageSelect value={stage} onChange={pickStage} />}
          </div>
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
                  classId={boy.class_id || classId}
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
        onClose={() => setPicked(null)}
      />
    </>
  )
}
