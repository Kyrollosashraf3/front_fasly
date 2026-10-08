import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { useDebounced, useQuery } from '../../hooks'
import { BoyAPI } from '../../lib/endpoints'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import { BoyForm, NoteCell } from './BoyForm'
import { BoyName } from './BoyName'
import { BoyProfileModal } from './BoyProfile'
import { calcAge } from '../../lib/format'
import './boys.css'

export default function BoysPage() {
  const { classId } = useParams()
  const { classLabel, can, user } = useAuth()
  const toast = useToast()
  const modal = useModal()

  const label = classLabel(classId)
  usePageTitle(`الأولاد — ${label}`)

  const canWrite = can.writeDirectory(user)

  const [search, setSearch] = useState('')
  const [flag, setFlag] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const debounced = useDebounced(search, 220)

  const { data: boys, loading, error, refetch } = useQuery(
    () => BoyAPI.list({ class_id: classId }),
    [classId],
  )

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return (boys || []).filter((b) => {
      if (flag === 'flagged' && !b.issue_flag) return false
      if (!q) return true
      return (
        b.boy_name.toLowerCase().includes(q) ||
        (b.phone || '').includes(q) ||
        (b.address || '').toLowerCase().includes(q) ||
        (b.zone || '').toLowerCase().includes(q)
      )
    })
  }, [boys, debounced, flag])

  const flaggedCount = (boys || []).filter((b) => b.issue_flag).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (boy) => {
    setEditing(boy)
    setFormOpen(true)
  }

  const remove = async (boy) => {
    const ok = await modal.confirm({
      title: `حذف "${boy.boy_name}"؟`,
      message: 'لو للولد حضور أو افتقاد مسجّل، السيرفر هيرفض الحذف.',
      confirmLabel: 'حذف',
    })
    if (!ok) return
    try {
      await BoyAPI.remove(boy.id)
      toast.success('تم حذف الولد.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    {
      key: 'boy_name',
      label: 'الاسم',
      mobile: 'الاسم',
      render: (b) => <BoyName boy={b} className="table__name" classId={classId} onSaved={refetch} />,
    },
    { key: 'gender', label: 'النوع', width: 80, mobile: 'النوع', render: (b) => (b.gender === 'f' ? 'بنت' : 'ولد') },
    { key: 'age', label: 'السن', width: 70, mobile: 'السن', render: (b) => calcAge(b.birth_date) ?? '—' },
    {
      key: 'phone',
      label: 'التليفون',
      width: 140,
      mobile: 'التليفون',
      render: (b) =>
        b.phone ? (
          <a className="ltr" style={{ display: 'block', textAlign: 'center' }} href={`tel:${b.phone}`}>
            {b.phone}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'note', label: 'ملاحظة', mobile: 'ملاحظة', render: (b) => <NoteCell note={b.note} /> },
    {
      key: 'actions',
      label: '',
      width: 130,
      align: 'end',
      mobile: '',
      render: (b) => (
        <div className="table__actions">
          <IconButton icon={<Icon name="eye" size={16} />} label="عرض" onClick={() => setViewing(b)} />
          {canWrite && (
            <>
              <IconButton icon={<Icon name="edit" size={16} />} label="تعديل" onClick={() => openEdit(b)} />
              <IconButton
                icon={<Icon name="trash" size={16} />}
                label="حذف"
                danger
                onClick={() => remove(b)}
              />
            </>
          )}
        </div>
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
            <span>الأولاد</span>
          </nav>
          <h1 className="page-head__title">بيانات الأولاد</h1>
          <div className="page-head__sub">
            {boys?.length ?? 0} ولد {flaggedCount > 0 && `· ${flaggedCount} محتاجين متابعة`}
          </div>
        </div>

        {canWrite && (
          <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
            إضافة ولد
          </Button>
        )}
      </div>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو التليفون..." />
        <Tabs
          value={flag}
          onChange={setFlag}
          options={[
            { value: 'all', label: 'الكل', count: boys?.length ?? 0 },
            { value: 'flagged', label: 'محتاج متابعة', count: flaggedCount },
          ]}
        />
        <ToolbarSpacer />
        <FileMenu
          items={[
            {
              key: 'template',
              label: 'تنزيل نموذج إكسل',
              icon: 'download',
              onClick: () => BoyAPI.template(),
            },
            {
              key: 'export',
              label: 'تصدير البيانات',
              icon: 'download',
              onClick: () => BoyAPI.export(classId),
            },
            canWrite && {
              key: 'import',
              label: 'استيراد من إكسل',
              icon: 'upload',
              fileInput: true,
              onFile: async (file) => {
                try {
                  const result = await BoyAPI.import(file)
                  setImportResult(result)
                  refetch()
                } catch (err) {
                  toast.error(err.message)
                }
              },
            },
          ].filter(Boolean)}
        />
        <a className="btn btn-secondary" href={`#/class/${classId}/attendance`}>
          <Icon name="calendar" size={15} />
          الحضور
        </a>
      </Toolbar>

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
                : canWrite
                  ? 'ابدأ بإضافة أولاد الفصل أو استورد ملف إكسل.'
                  : 'لسه مفيش أولاد متسجلين في الفصل ده.'
            }
            action={
              canWrite && !search && flag === 'all' ? (
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

      <BoyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        boy={editing}
        defaultClassId={Number(classId)}
        onSaved={refetch}
      />

      <BoyProfileModal open={Boolean(viewing)} boy={viewing} onClose={() => setViewing(null)} />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="الأولاد"
      />
    </>
  )
}
