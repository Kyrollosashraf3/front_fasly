import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { TeacherAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import { NoteCell } from '../boys/BoyForm'
import { TeacherForm } from './TeacherForm'
import { formatDate } from '../../lib/format'
import './teachers.css'

export default function TeachersPage() {
  const { classId } = useParams()
  const { classLabel, can, user, isServant } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const label = classLabel(classId)
  usePageTitle(`الخدام — ${label}`)

  const canWrite = can.writeDirectory(user)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const debounced = useDebounced(search, 220)

  const { data: teachers, loading, error, refetch } = useQuery(
    () => TeacherAPI.list({ class_id: classId }),
    [classId],
  )

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (teachers || []).filter(
      (t) =>
        !q ||
        t.teacher_name.toLowerCase().includes(q) ||
        (t.phone || '').includes(q) ||
        (t.phone_2 || '').includes(q) ||
        (t.zone || '').toLowerCase().includes(q) ||
        (t.address || '').toLowerCase().includes(q),
    )
  }, [teachers, debounced])

  const remove = async (teacher) => {
    const ok = await modal.confirm({
      title: `حذف "${teacher.teacher_name}"؟`,
      message: 'لو الخادم عنده افتقاد أو متابعة مسجّلة، السيرفر هيرفض الحذف.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await TeacherAPI.remove(teacher.id)
      toast.success('تم حذف الخادم.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    {
      key: 'teacher_name',
      label: 'الاسم',
      mobile: 'الاسم',
      render: (t) => <span className="table__name">{t.teacher_name}</span>,
    },
    {
      key: 'phone',
      label: 'التليفون',
      width: 150,
      mobile: 'التليفون',
      render: (t) =>
        t.phone ? (
          <a className="ltr" style={{ display: 'block', textAlign: 'center' }} href={`tel:${t.phone}`}>
            {t.phone}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'last_visit_date',
      label: 'آخر اعتراف / زيارة',
      width: 170,
      mobile: 'آخر زيارة',
      render: (t) =>
        t.last_visit_date ? (
          <span className="row" style={{ gap: 6 }}>
            <Icon name="calendar" size={14} />
            {formatDate(t.last_visit_date, { withDay: false })}
          </span>
        ) : (
          <Badge kind="neutral">لم يُسجّل</Badge>
        ),
    },
    { key: 'note', label: 'ملاحظة', mobile: 'ملاحظة', render: (t) => <NoteCell note={t.note} /> },
    {
      key: 'actions',
      label: '',
      width: 90,
      align: 'end',
      mobile: '',
      render: (t) =>
        canWrite ? (
          <div className="table__actions">
            <IconButton icon={<Icon name="edit" size={16} />} label="تعديل" onClick={() => { setEditing(t); setFormOpen(true) }} />
            <IconButton icon={<Icon name="trash" size={16} />} label="حذف" danger onClick={() => remove(t)} />
          </div>
        ) : (
          <span className="muted xsmall">—</span>
        ),
    },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <nav className="page-head__crumb">
            <a href="#/">الفصول</a>
            <span aria-hidden="true">/</span>
            <a href={`#/class/${classId}`}>{label}</a>
            <span aria-hidden="true">/</span>
            <span>الخدام</span>
          </nav>
          <h1 className="page-head__title">دليل الخدام</h1>
          <div className="page-head__sub">
            {teachers?.length ?? 0} خادم مسند للفصل
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <Link className="btn btn-secondary" to={`/class/${classId}/checks`}>
            <Icon name="clipboard" size={15} />
            متابعة الخدام
          </Link>
          {canWrite && (
            <Button
              variant="primary"
              icon={<Icon name="plus" size={16} />}
              onClick={() => { setEditing(null); setFormOpen(true) }}
            >
              إضافة خادم
            </Button>
          )}
        </div>
      </div>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو التليفون أو العنوان..." />
        <ToolbarSpacer />
        <FileMenu
          items={[
            { key: 'template', label: 'تنزيل نموذج إكسل', icon: 'download', onClick: () => TeacherAPI.template() },
            { key: 'export', label: 'تصدير البيانات', icon: 'download', onClick: () => TeacherAPI.export(classId) },
            canWrite && {
              key: 'import',
              label: 'استيراد من إكسل',
              icon: 'upload',
              fileInput: true,
              onFile: async (file) => {
                try {
                  setImportResult(await TeacherAPI.import(file))
                  refetch()
                } catch (err) {
                  toast.error(err.message)
                }
              },
            },
          ].filter(Boolean)}
        />
      </Toolbar>

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
                <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
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
        defaultClassId={Number(classId)}
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
