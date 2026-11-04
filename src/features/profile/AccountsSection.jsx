import { Icon } from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { IconButton } from '../../components/ui/Button'
import { SearchInput, Select } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { Table } from '../../components/ui/Table'
import { Badge, RoleBadge } from '../../components/ui/Badge'
import { SectionTitle } from '../../components/ui/Bits'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/States'
import { BoyName } from '../boys/BoyName'
import { ROLE_LABELS, ROLE_OPTIONS } from '../../lib/roles'
import { attachedBoy, handleOf } from './accountHelpers'

/** The manager-only account list, with its filters and row actions. */
export function AccountsSection({ accounts, classes }) {
  const { allClassesLabel } = useAuth()
  const {
    users,
    usersLoading,
    usersError,
    refetchUsers,
    refetchPeople,
    filteredUsers,
    nameOf,
    classOf,
    removeUser,
    setDialog,
    roleFilter,
    setRoleFilter,
    classFilter,
    setClassFilter,
    statusFilter,
    setStatusFilter,
    nameQuery,
    setNameQuery,
    nameSort,
    setNameSort,
    boys,
  } = accounts

  return (
    <section style={{ marginTop: 'var(--sp-6)' }}>
      <SectionTitle>الحسابات</SectionTitle>

      {usersLoading ? (
        <SkeletonRows rows={4} cols={4} />
      ) : usersError ? (
        <ErrorState error={usersError} onRetry={refetchUsers} />
      ) : !users?.length ? (
        <EmptyState icon="lock" title="لا توجد حسابات" message="لا توجد حسابات مسجلة بعد." />
      ) : (
        <>
          <Toolbar className="toolbar--scroll">
            <SearchInput
              value={nameQuery}
              onChange={setNameQuery}
              placeholder="ابحث بالاسم..."
            />

            <label className="row small bold" style={{ gap: 8 }}>
              <Icon name="shield" size={16} />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="select--plain"
                style={{ minWidth: 170 }}
                aria-label="فلتر الصلاحية"
              >
                <option value="">كل الصلاحيات</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </label>

            {classes.length > 1 && (
              <label className="row small bold" style={{ gap: 8 }}>
                <Icon name="groups" size={16} />
                <Select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="select--plain"
                  style={{ minWidth: 170 }}
                  aria-label="فلتر الفصل"
                  searchable
                  searchPlaceholder="ابحث باسم الفصل..."
                >
                  <option value="">{allClassesLabel}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}

            <label className="row small bold" style={{ gap: 8 }}>
              <Icon name="check" size={16} />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select--plain"
                style={{ minWidth: 170 }}
                aria-label="فلتر حالة الحساب"
              >
                <option value="">كل الحالات</option>
                <option value="active">مفعل</option>
                <option value="pending">بانتظار التسجيل</option>
              </Select>
            </label>

            <label className="row small bold" style={{ gap: 8 }}>
              <Icon name="list" size={16} />
              <Select
                value={nameSort}
                onChange={(e) => setNameSort(e.target.value)}
                className="select--plain"
                style={{ minWidth: 170 }}
                aria-label="ترتيب الاسم"
              >
                <option value="">بدون ترتيب</option>
                <option value="asc">الاسم: أ ← ي</option>
                <option value="desc">الاسم: ي ← أ</option>
              </Select>
            </label>

            <ToolbarSpacer />
            <span className="small muted">{filteredUsers.length} حساب</span>
          </Toolbar>

          <ToolbarSearch
            value={nameQuery}
            onChange={setNameQuery}
            placeholder="ابحث بالاسم..."
          />

          {!filteredUsers.length ? (
            <EmptyState
              icon="filter"
              title="لا توجد نتائج"
              message="مفيش حسابات مطابقة للفلتر."
            />
          ) : (
            <Table
              key={`accounts-${nameSort}`}
              sortable
              initialSort={nameSort ? { key: 'name', dir: nameSort } : null}
              compact
              stackOnMobile
              rows={filteredUsers}
              rowKey={(u) => u.id}
              columns={[
                {
                  key: 'name',
                  label: 'الاسم',
                  mobile: 'الاسم',
                  sortValue: nameOf,
                  render: (u) => {
                    const b = attachedBoy(boys, u)
                    if (b) return <BoyName boy={b} onSaved={refetchPeople} flag={false} />
                    return <span className="table__name">{nameOf(u)}</span>
                  },
                },
                {
                  key: 'class',
                  label: 'الفصل',
                  width: 150,
                  mobile: 'الفصل',
                  sortValue: classOf,
                  render: (u) => <span className="small muted">{classOf(u)}</span>,
                },
                {
                  key: 'phone',
                  label: 'رقم التليفون',
                  width: 170,
                  mobile: 'رقم التليفون',
                  sortValue: (u) => u?.phone || '',
                  render: (u) => (
                    <span className="table__name" dir="ltr">
                      {handleOf(u)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: 'حالة الحساب',
                  width: 150,
                  mobile: 'حالة الحساب',
                  sortValue: (u) => (u?.pending_signup ? 1 : 0),
                  render: (u) =>
                    u?.pending_signup ? (
                      <Badge kind="gold">بانتظار التسجيل</Badge>
                    ) : (
                      <Badge kind="green">مفعل</Badge>
                    ),
                },
                {
                  key: 'role',
                  label: 'الصلاحية',
                  width: 130,
                  mobile: 'الصلاحية',
                  sortValue: (u) => ROLE_LABELS[u.role] || u.role,
                  render: (u) => <RoleBadge role={u.role} />,
                },
                {
                  key: 'actions',
                  label: '',
                  width: 100,
                  align: 'end',
                  mobile: '',
                  sortable: false,
                  render: (u) => (
                    <div className="table__actions">
                      <IconButton
                        icon={<Icon name="edit" size={15} />}
                        label="تعديل"
                        onClick={() => setDialog(u)}
                      />
                      <IconButton
                        icon={<Icon name="trash" size={15} />}
                        label="حذف"
                        danger
                        onClick={() => removeUser(u)}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
    </section>
  )
}
