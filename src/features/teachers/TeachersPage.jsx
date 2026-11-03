import { Link } from 'react-router-dom'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { ImportResult } from '../../components/ui/ImportResult'
import { TeacherForm } from './TeacherForm'
import { TeachersToolbar } from './TeachersToolbar'
import { teachersColumns } from './teachersColumns'
import { useTeachersList } from './useTeachersList'
import './teachers.css'

export default function TeachersPage() {
  const list = useTeachersList()
  const {
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
  } = list

  usePageTitle(`الخدام — ${label}`)

  const columns = teachersColumns({ multi, classLabel, canWrite, openEdit, remove })

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الرئيسية</a>
            <span aria-hidden="true">/</span>
            {allClasses ? (
              <span>الخدام</span>
            ) : (
              <>
                <a href={`#/class/${classId}`}>{label}</a>
                <span aria-hidden="true">/</span>
                <span>الخدام</span>
              </>
            )}
          </nav>
          <div className="page-head__sub">
            {teachers?.length ?? 0} خادم {allClasses ? 'في كل الفصول' : `مسند لـ ${label}`}
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <Link className="btn btn-secondary" to={classId ? `/class/${classId}/checks` : '/checks'}>
            <Icon name="clipboard" size={15} />
            متابعة الخدام
          </Link>
          {canWrite && (
            <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
              إضافة خادم
            </Button>
          )}
        </div>
      </div>

      <TeachersToolbar
        classId={classId}
        multi={multi}
        classes={classes}
        picked={picked}
        setPicked={setPicked}
        search={search}
        setSearch={setSearch}
        canWrite={canWrite}
        setImportResult={setImportResult}
        refetch={refetch}
        toast={toast}
      />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {loading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={search ? 'search' : 'servant'}
            title={search ? 'لا توجد نتائج' : 'لا يوجد خدام'}
            message={
              search
                ? 'جرّب بحثًا مختلفًا.'
                : isServant
                  ? 'لسه مفيش خدام متسجلين.'
                  : 'ابدأ بإضافة خدام الفصل أو استورد ملف إكسل.'
            }
            action={
              canWrite && !search ? (
                <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
                  إضافة خادم
                </Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={rows} rowKey={(t) => t.id} stackOnMobile />
        )}
      </div>

      <TeacherForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        teacher={editing}
        defaultClassId={classId ? Number(classId) : undefined}
        onSaved={refetch}
      />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="الخدام"
      />
    </>
  )
}
