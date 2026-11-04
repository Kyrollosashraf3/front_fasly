import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { ImportResult } from '../../components/ui/ImportResult'
import { BoyAPI } from '../../lib/endpoints'
import { BoyForm } from './BoyForm'
import { BoyProfileModal } from './BoyProfile'
import { BoysToolbar } from './BoysToolbar'
import { DuplicateNamesModal } from './DuplicateNamesModal'
import { boysColumns } from './boysColumns'
import { useBoysList } from './useBoysList'
import './boys.css'

export default function BoysPage() {
  const list = useBoysList()
  const {
    classLabel,
    classId,
    multi,
    picked,
    setPicked,
    stage,
    pickStage,
    visibleClasses,
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
    dupsOpen,
    setDupsOpen,
    dupsVersion,
    reload,
    boys,
    loading,
    error,
    refetch,
    rows,
    flaggedCount,
    openCreate,
    openEdit,
    remove,
  } = list

  usePageTitle(`الأولاد — ${label}`)

  // A duplicate-name note on another screen sends you here with the boy to
  // open: ?boy=ID is read once, the card opens and the address is cleaned up.
  const [params, setParams] = useSearchParams()
  const openId = params.get('boy')

  useEffect(() => {
    if (!openId) return
    const rest = new URLSearchParams(params)
    rest.delete('boy')
    setParams(rest, { replace: true })
    BoyAPI.get(openId)
      .then(setViewing)
      .catch((err) => toast.error(err.message))
  }, [openId, params, setParams, setViewing, toast])

  const columns = boysColumns({
    classId,
    multi,
    classLabel,
    canManageBoys,
    canWrite,
    setViewing,
    openEdit,
    remove,
    refetch: reload,
  })

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الرئيسية</a>
            <span aria-hidden="true">/</span>
            {allClasses ? (
              <span>الأولاد</span>
            ) : (
              <>
                <a href={`#/class/${classId}`}>{label}</a>
                <span aria-hidden="true">/</span>
                <span>الأولاد</span>
              </>
            )}
          </nav>
          <div className="page-head__sub">
            {boys?.length ?? 0} ولد {allClasses ? '' : `في ${label}`}{' '}
            {flaggedCount > 0 && `· ${flaggedCount} محتاجين متابعة`}
          </div>
        </div>

        {canManageBoys && (
          <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
            إضافة ولد
          </Button>
        )}
      </div>

      <BoysToolbar
        classId={classId}
        multi={multi}
        picked={picked}
        setPicked={setPicked}
        stage={stage}
        pickStage={pickStage}
        visibleClasses={visibleClasses}
        search={search}
        setSearch={setSearch}
        flag={flag}
        setFlag={setFlag}
        boys={boys}
        flaggedCount={flaggedCount}
        canManageBoys={canManageBoys}
        canWrite={canWrite}
        setImportResult={setImportResult}
        refetch={refetch}
        toast={toast}
        onOpenDuplicates={() => setDupsOpen(true)}
      />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {loading ? (
          <SkeletonRows rows={7} cols={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={search || flag !== 'all' ? 'search' : 'boys'}
            title={search || flag !== 'all' ? 'لا توجد نتائج' : 'لا يوجد أولاد'}
            message={
              search || flag !== 'all'
                ? 'جرّب بحثًا مختلفًا.'
                : canManageBoys
                  ? 'ابدأ بإضافة أولاد الفصل.'
                  : 'لسه مفيش أولاد متسجلين في الفصل ده.'
            }
            action={
              canManageBoys && !search && flag === 'all' ? (
                <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
                  إضافة ولد
                </Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(b) => b.id} stackOnMobile />
        )}
      </div>

      <DuplicateNamesModal
        open={dupsOpen}
        onClose={() => setDupsOpen(false)}
        classId={classId}
        label={label}
        version={dupsVersion}
        canManageBoys={canManageBoys}
        canWrite={canWrite}
        toast={toast}
        openEdit={openEdit}
        setViewing={setViewing}
        remove={remove}
      />

      <BoyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        boy={editing}
        defaultClassId={classId ? Number(classId) : undefined}
        onSaved={reload}
      />

      <BoyProfileModal
        open={Boolean(viewing)}
        boy={viewing}
        onClose={() => setViewing(null)}
        onChanged={reload}
      />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="الأولاد"
      />
    </>
  )
}
