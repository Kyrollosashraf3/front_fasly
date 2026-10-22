import { Icon } from '../../components/ui/Icon'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput, Select } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { todayISO } from '../../lib/format'

/** Class / servant / date / search / status filters for the follow-up sheet. */
export function FollowUpToolbar({ sheet, multi, classes, scopeClassId }) {
  const {
    data,
    teacherId,
    setTeacherId,
    date,
    changeDate,
    changeClass,
    search,
    setSearch,
    status,
    setStatus,
    counts,
  } = sheet

  return (
    <Toolbar className="toolbar--scroll">
      {multi && (
        <ClassFilter
          value={scopeClassId}
          onChange={changeClass}
          classes={classes}
        />
      )}
      <label className="row small bold" style={{ gap: 8 }}>
        <Icon name="servant" size={16} />
        <Select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="select--plain"
          style={{ minWidth: 190 }}
          aria-label="اختيار الخادم"
        >
          <option value="">كل الخدام</option>
          {(data?.teachers || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.teacher_name}
            </option>
          ))}
        </Select>
      </label>

      <label className="row small bold" style={{ gap: 8 }}>
        <Icon name="calendar" size={16} />
        <Input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => changeDate(e.target.value)}
          style={{ width: 160 }}
        />
      </label>

      <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />

      <Tabs
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'الكل', count: counts.total },
          { value: 'todo', label: 'المتبقي', count: counts.total - counts.done },
          { value: 'done', label: 'المتسجل', count: counts.done },
        ]}
      />

      <ToolbarSpacer />
    </Toolbar>
  )
}
