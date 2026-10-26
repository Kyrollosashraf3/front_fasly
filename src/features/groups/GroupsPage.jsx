import { useEffect, useMemo, useRef, useState } from 'react'
import { usePageTitle } from '../../context/TitleContext'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { SearchInput } from '../../components/ui/Field'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { GroupAPI } from '../../lib/endpoints'
import { useGroups } from './useGroups'
import './groups.css'

/**
 * GroupsPage — one simple board.
 *
 * Top: every servant of the class as a button (plus a search box), a boy
 *      search that opens the servant the boy belongs to, and the Excel menu.
 * Middle: the boys of the chosen servant as boxes; hovering a box reveals
 *         "move" and "remove from this group".
 * Bottom: the boys with no group — clicking one adds him to the open servant.
 */
export default function GroupsPage() {
  usePageTitle('المجموعات')

  const toast = useToast()

  const {
    classes,
    canWrite,
    classId,
    setClassId,
    data,
    error,
    refetch,
    servants,
    active,
    setActiveId,
    unassigned,
    busyId,
    assign,
    remove,
    move,
  } = useGroups()

  const [query, setQuery] = useState('')
  const [moving, setMoving] = useState(null)
  const [foundId, setFoundId] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const foundRef = useRef(null)

  const search = query.trim()
  const visibleServants = useMemo(
    () => (search ? servants.filter((s) => s.name.includes(search)) : servants),
    [servants, search],
  )

  // Every boy in one list: his option hint is the servant he belongs to, so
  // typing a boy's name answers "whose group is he in?" straight away.
  const boyOptions = useMemo(
    () => [
      ...servants.flatMap((s) =>
        s.boys.map((b) => ({
          value: String(b.boy_id),
          label: b.boy_name,
          hint: s.name,
          servantId: s.id,
          boy: b,
        })),
      ),
      ...unassigned.map((b) => ({
        value: String(b.boy_id),
        label: b.boy_name,
        hint: 'بدون مجموعة',
        servantId: '',
        boy: b,
      })),
    ],
    [servants, unassigned],
  )

  const pickBoy = (value) => {
    const option = boyOptions.find((o) => o.value === value)
    if (!option) return
    if (option.servantId) {
      setActiveId(option.servantId)
      setFoundId(option.boy.boy_id)
      return
    }
    if (active && canWrite) {
      setFoundId(option.boy.boy_id)
      assign(option.boy, active.id)
      return
    }
    toast.info('الولد ده لسه بدون مجموعة — اختار خادم من فوق عشان تضيفه.')
  }

  // A boy found through the search is ringed in gold, then the mark fades.
  useEffect(() => {
    if (foundId == null) return undefined
    foundRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const timer = setTimeout(() => setFoundId(null), 2600)
    return () => clearTimeout(timer)
  }, [foundId, data])

  // Switching class clears the highlight (the boy is not on the new board).
  useEffect(() => {
    setFoundId(null)
  }, [classId])

  const importGroups = async (file) => {
    try {
      const result = await GroupAPI.import(file)
      setImportResult(result)
      refetch()
    } catch (err) {
      toast.error(err)
    }
  }

  const closeMove = () => setMoving(null)

  const moveTo = async (teacherId) => {
    if (!moving) return
    if (await move(moving, teacherId)) closeMove()
  }

  const excelItems = [
    {
      key: 'template',
      label: 'نموذج إكسل للمجموعات',
      icon: 'download',
      onClick: () => GroupAPI.template(classId),
    },
    {
      key: 'export',
      label: 'تنزيل المجموعات الحالية',
      icon: 'download',
      onClick: () => GroupAPI.export(classId),
    },
    canWrite && {
      key: 'import',
      label: 'رفع مجموعات من إكسل',
      icon: 'upload',
      fileInput: true,
      onFile: importGroups,
    },
  ].filter(Boolean)

  const boyClass = (b) =>
    `groups-boy${busyId === b.boy_id ? ' is-busy' : ''}${
      b.boy_id === foundId ? ' is-found' : ''
    }`

  return (
    <div className="groups-board card">
      <div className="groups-board__top">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="ابحث باسم الخادم..."
          className="groups-board__search"
        />
        <SearchSelect
          value=""
          onChange={pickBoy}
          options={boyOptions}
          placeholder="ابحث باسم الولد..."
          searchPlaceholder="اكتب اسم الولد... (هتلاقي خادمه جنبه)"
          ariaLabel="اختيار الولد"
          className="groups-board__boy"
          clearable={false}
        />
        {classes.length > 1 && (
          <select
            className="select groups-board__class"
            aria-label="الفصل"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <FileMenu items={excelItems} />
      </div>

      {!data && !error ? (
        <SkeletonRows rows={5} cols={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="groups-servants">
            {visibleServants.map((s) => {
              const on = s.id === active?.id
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`groups-servant${on ? ' is-active' : ''}`}
                  aria-pressed={on}
                  onClick={() => setActiveId(on ? '' : s.id)}
                >
                  <span className="groups-servant__name">{s.name}</span>
                  <span className="groups-servant__count">{s.boys.length}</span>
                </button>
              )
            })}
            {visibleServants.length === 0 && (
              <p className="groups-hint">
                {search ? 'مفيش خادم بالاسم ده.' : 'مفيش خدام متسجلين في الفصل ده.'}
              </p>
            )}
          </div>

          <section className="groups-group">
            {active ? (
              <>
                <div className="groups-group__head">
                  <span className="groups-group__name">{active.name}</span>
                  <span className="groups-group__count">{active.boys.length} ولد</span>
                </div>

                {active.boys.length ? (
                  <div className="groups-boys">
                    {active.boys.map((b) => (
                      <div
                        key={b.boy_id}
                        ref={b.boy_id === foundId ? foundRef : null}
                        className={boyClass(b)}
                      >
                        <span className="groups-boy__name">{b.boy_name}</span>
                        {canWrite && (
                          <span className="groups-boy__actions">
                            <button
                              type="button"
                              className="groups-boy__btn"
                              aria-label={`نقل ${b.boy_name} لخادم تاني`}
                              title="نقل لخادم تاني"
                              onClick={() => setMoving(b)}
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              type="button"
                              className="groups-boy__btn groups-boy__btn--danger"
                              aria-label={`إزالة ${b.boy_name} من المجموعة`}
                              title="إزالة من المجموعة"
                              onClick={() => remove(b)}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="groups-hint">
                    مفيش أولاد في المجموعة دي — دوس على ولد من «بدون مجموعة» تحت
                    عشان تضيفه.
                  </p>
                )}
              </>
            ) : (
              <p className="groups-hint">اختار خادم من فوق عشان تشوف أولاده.</p>
            )}
          </section>

          <section className="groups-group groups-group--unassigned">
            <div className="groups-group__head">
              <span className="groups-group__name">بدون مجموعة</span>
              <span className="groups-group__count">{unassigned.length} ولد</span>
            </div>

            {unassigned.length ? (
              <>
                {active && canWrite ? (
                  <p className="groups-hint">
                    دوس على أي ولد عشان تضيفه لمجموعة {active.name}.
                  </p>
                ) : null}
                {!active ? (
                  <p className="groups-hint">
                    اختار خادم من فوق عشان تقدر تضيف الأولاد دول لمجموعته.
                  </p>
                ) : null}

                <div className="groups-boys">
                  {unassigned.map((b) =>
                    active && canWrite ? (
                      <button
                        key={b.boy_id}
                        type="button"
                        ref={b.boy_id === foundId ? foundRef : null}
                        className={`${boyClass(b)} groups-boy--unassigned is-pickable`}
                        aria-label={`إضافة ${b.boy_name} لمجموعة ${active.name}`}
                        title={`إضافة لمجموعة ${active.name}`}
                        onClick={() => assign(b, active.id)}
                      >
                        <span className="groups-boy__name">{b.boy_name}</span>
                        <Icon name="plus" size={14} className="groups-boy__plus" />
                      </button>
                    ) : (
                      <div
                        key={b.boy_id}
                        ref={b.boy_id === foundId ? foundRef : null}
                        className={`${boyClass(b)} groups-boy--unassigned`}
                      >
                        <span className="groups-boy__name">{b.boy_name}</span>
                      </div>
                    ),
                  )}
                </div>
              </>
            ) : (
              <p className="groups-hint">كل الأولاد متوزعين.</p>
            )}
          </section>
        </>
      )}

      <Modal
        open={Boolean(moving)}
        size="sm"
        title="نقل الولد"
        sub={moving?.boy_name}
        onClose={closeMove}
      >
        <div className="groups-move">
          {servants
            .filter((s) => s.id !== active?.id)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                className="groups-move__option"
                disabled={busyId != null}
                onClick={() => moveTo(s.id)}
              >
                <span>{s.name}</span>
                <span className="groups-servant__count">{s.boys.length}</span>
              </button>
            ))}
          {servants.length <= 1 && (
            <p className="groups-hint">مفيش خادم تاني في الفصل ده.</p>
          )}
        </div>
      </Modal>

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="المجموعات"
      />
    </div>
  )
}
