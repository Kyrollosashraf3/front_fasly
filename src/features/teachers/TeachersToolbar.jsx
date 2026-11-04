import { TeacherAPI } from '../../lib/endpoints'
import { useAuth } from '../../context/AuthContext'
import { stageLabel } from '../../lib/stages'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { StageSelect } from '../../components/ui/StageSelect'
import { SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { FileMenu } from '../../components/ui/FileMenu'

/** Search, class filter and import/export for the servants directory. */
export function TeachersToolbar({
  classId,
  multi,
  picked,
  setPicked,
  stage,
  pickStage,
  visibleClasses,
  search,
  setSearch,
  canWrite,
  setImportResult,
  refetch,
  toast,
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
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالاسم أو التليفون أو العنوان..." />
        <ToolbarSpacer />
        <FileMenu
          items={[
            { key: 'template', label: 'تنزيل نموذج إكسل', icon: 'download', onClick: () => TeacherAPI.template() },
            { key: 'export', label: 'تصدير البيانات', icon: 'download', onClick: () => TeacherAPI.export(classId || undefined) },
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

      <ToolbarSearch value={search} onChange={setSearch} placeholder="ابحث بالاسم أو التليفون أو العنوان..." />
    </>
  )
}
