import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { Toolbar, ToolbarSpacer } from '../../components/ui/Toolbar'

/** Class / servant / boy filters plus the page-wide edit toggle. */
export function GroupToolbar({ groups, isSuperAdmin, canWrite }) {
  const {
    showClassPicker,
    classOptions,
    effectiveClassId,
    setClassId,
    selectedTeacherId,
    setSelectedTeacherId,
    teacherOptions,
    selectedBoyId,
    setSelectedBoyId,
    boyOptions,
    clearFilters,
    editing,
    toggleEditing,
  } = groups

  const filtered = Boolean(selectedTeacherId || selectedBoyId)

  return (
    <Toolbar className="toolbar--scroll">
      {showClassPicker && (
        <SearchSelect
          value={effectiveClassId}
          onChange={setClassId}
          options={classOptions}
          placeholder="اختار الفصل"
          searchPlaceholder="ابحث باسم الفصل..."
          ariaLabel="اختيار الفصل"
          style={{ minWidth: 185 }}
        />
      )}

      <SearchSelect
        value={selectedTeacherId}
        onChange={setSelectedTeacherId}
        options={teacherOptions}
        placeholder="كل الخدام"
        searchPlaceholder="ابحث باسم الخادم..."
        ariaLabel="اختيار الخادم"
        style={{ minWidth: 220 }}
      />

      <SearchSelect
        value={selectedBoyId}
        onChange={setSelectedBoyId}
        options={boyOptions}
        placeholder="كل الأولاد"
        searchPlaceholder="ابحث باسم الولد أو المجموعة..."
        ariaLabel="اختيار الولد"
        style={{ minWidth: 260 }}
      />

      {filtered && (
        <Button size="sm" variant="ghost" onClick={clearFilters}>
          مسح الفلاتر
        </Button>
      )}

      <ToolbarSpacer />
      {isSuperAdmin && <Badge kind="gold">أدمن عام</Badge>}
      {canWrite && (
        <Button
          size="sm"
          variant={editing ? 'primary' : 'secondary'}
          icon={<Icon name={editing ? 'check' : 'edit'} size={15} />}
          onClick={toggleEditing}
        >
          {editing ? 'إنهاء التعديل' : 'تعديل'}
        </Button>
      )}
    </Toolbar>
  )
}
