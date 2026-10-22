import { Icon } from '../../components/ui/Icon'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar } from '../../components/ui/Toolbar'
import { todayISO } from '../../lib/format'

/** Class / date / search / gender / view filters for the Friday sheet. */
export function AttendanceToolbar({ sheet, classId, multi, classes }) {
  const {
    date,
    changeDate,
    changeClass,
    search,
    setSearch,
    gender,
    setGender,
    view,
    setView,
    counts,
  } = sheet

  return (
    <Toolbar className="toolbar--scroll">
      {multi && (
        <ClassFilter value={classId} onChange={changeClass} classes={classes} ariaLabel="اختيار فصل الحضور" />
      )}
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
        value={gender}
        onChange={setGender}
        options={[
          { value: 'all', label: 'الكل' },
          { value: 'm', label: 'أولاد' },
          { value: 'f', label: 'بنات' },
        ]}
      />

      <Tabs
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: 'الكل', count: counts.total },
          { value: 'present', label: 'الحاضرون', count: counts.present },
          { value: 'absent', label: 'الغائبون', count: counts.absent },
        ]}
      />
    </Toolbar>
  )
}
