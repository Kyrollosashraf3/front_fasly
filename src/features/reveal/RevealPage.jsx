import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { BoyAPI, TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { SearchInput, Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { BoyProfileModal } from '../boys/BoyProfile'
import './reveal.css'

/**
 * RevealPage — "اكشفلي": pick a boy, open his full file since the season start.
 * The heavy lifting (season grid, notes, follow-ups) lives in BoyProfileModal.
 */
export default function RevealPage() {
  usePageTitle('اكشفلي')
  const { classes, classReady, isBoy, user, can } = useAuth()

  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)

  const debounced = useDebounced(search, 200)
  const effectiveClassId = classId || classes[0]?.id || ''

  const { data, loading, error, refetch } = useQuery(
    async () => {
      const boys = await BoyAPI.list(effectiveClassId ? { class_id: effectiveClassId } : {})
      const teachers = isBoy
        ? []
        : await TeacherAPI.list({ class_id: effectiveClassId }).catch(() => [])
      return { boys, teachers }
    },
    [effectiveClassId, isBoy],
    { enabled: Boolean(classReady) },
  )

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (data?.boys || []).filter((b) => !q || (b.boy_name || '').toLowerCase().includes(q))
  }, [data, debounced])

  const showPicker = can.seeServants(user) && !isBoy

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">اكشفلي</h1>
          <div className="page-head__sub">اختار الولد واعرض ملفه الكامل من أول السنة</div>
        </div>
      </div>

      <Toolbar>
        <Select
          value={effectiveClassId}
          onChange={(e) => {
            setClassId(e.target.value)
            setPicked(null)
          }}
          className="select--plain"
          style={{ minWidth: 190 }}
          aria-label="اختيار الفصل"
        >
          <option value="">— اختر الفصل —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

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

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {!classReady || loading ? (
          <SkeletonRows rows={6} cols={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="boys"
            title="لا يوجد أولاد"
            message={
              effectiveClassId
                ? 'لا توجد أسماء مطابقة في الفصل ده.'
                : 'اختار الفصل الأول عشان تظهر الأولاد.'
            }
          />
        ) : (
          <div className="candidate-list">
            {rows.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`candidate ${picked?.id === b.id ? 'is-picked' : ''}`}
                onClick={() => setPicked(b)}
              >
                <Avatar name={b.boy_name} size="sm" />
                <span className="candidate__name truncate">{b.boy_name}</span>
                {b.issue_flag && <Badge kind="red" dot />}
              </button>
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
        boy={picked ? { ...picked, class_id: picked.class_id || Number(effectiveClassId) } : null}
        onClose={() => setPicked(null)}
      />
    </>
  )
}
