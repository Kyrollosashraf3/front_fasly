import { useAuth } from '../../context/AuthContext'
import { BoyAPI } from '../../lib/endpoints'
import { stageLabel } from '../../lib/stages'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { StageSelect } from '../../components/ui/StageSelect'
import { SearchInput } from '../../components/ui/Field'
import { Tabs, Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { FileMenu } from '../../components/ui/FileMenu'

/** Search, filters, import/export and shortcuts for the boys list. */
export function BoysToolbar({
  classId,
  multi,
  picked,
  setPicked,
  stage,
  pickStage,
  visibleClasses,
  search,
  setSearch,
  flag,
  setFlag,
  boys,
  flaggedCount,
  canManageBoys,
  canWrite,
  setImportResult,
  refetch,
  toast,
  onOpenDuplicates,
}) {
  const { allClassesLabel, isSuperAdmin } = useAuth()
  return (
    <>
      <Toolbar className="toolbar--scroll">
        {multi && (
          <div className="stage-filters">
            <ClassFilter
              value={picked}
              onChange={setPicked}
              classes={visibleClasses}
              allLabel={stage ? `كل ${stageLabel(stage)}` : allClassesLabel}
            />
            {isSuperAdmin && <StageSelect value={stage} onChange={pickStage} />}
          </div>
        )}
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
              onClick: () => BoyAPI.export(classId || undefined),
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
        {canManageBoys && (
          <Button variant="secondary" icon={<Icon name="alert" size={15} />} onClick={onOpenDuplicates}>
            أسماء متكررة
          </Button>
        )}
        <a className="btn btn-secondary" href={classId ? `#/class/${classId}/attendance` : '#/attendance'}>
          <Icon name="calendar" size={15} />
          الحضور
        </a>
      </Toolbar>

      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم أو التليفون..." />
    </>
  )
}
