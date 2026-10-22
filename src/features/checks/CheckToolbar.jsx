import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { Input, SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'
import { todayISO } from '../../lib/format'

/** Class / date / search toolbar plus the «الكل حاضر» shortcut. */
export function CheckToolbar({ sheet, multi, classes, picked, firstClassId, canWrite }) {
  const { date, changeDate, changeClass, search, setSearch, stats, setAllPresent } = sheet

  return (
    <Toolbar className="toolbar--scroll">
      {multi && (
        <ClassFilter
          value={picked || firstClassId}
          onChange={changeClass}
          classes={classes}
        />
      )}
      <label className="row small bold" style={{ gap: 8 }}>
        <Icon name="calendar" size={16} />
        <Input
          type="date"
          value={date}
          max={todayISO()}
          disabled={!canWrite}
          onChange={(e) => changeDate(e.target.value)}
          style={{ width: 160 }}
        />
      </label>

      <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم..." />
      <ToolbarSpacer />

      {canWrite && (
        <div className="toolbar__group">
          <Button variant="ghost" size="sm" onClick={() => setAllPresent(true)}>
            الكل حاضر
          </Button>
          <span className="badge badge--navy">
            {stats.done} / {stats.total} اتعلّموا
          </span>
        </div>
      )}
    </Toolbar>
  )
}
