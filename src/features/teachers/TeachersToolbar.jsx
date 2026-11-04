import { TeacherAPI } from '../../lib/endpoints'
import { useAuth } from '../../context/AuthContext'
import { ClassFilter } from '../../components/ui/ClassFilter'
import { SearchInput } from '../../components/ui/Field'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '../../components/ui/Toolbar'
import { FileMenu } from '../../components/ui/FileMenu'

/** Search, class filter and import/export for the servants directory. */
export function TeachersToolbar({
  classId,
  multi,
  classes,
  picked,
  setPicked,
  search,
  setSearch,
  canWrite,
  setImportResult,
  refetch,
  toast,
}) {
  const { allClassesLabel } = useAuth()

  return (
    <>
      <Toolbar className="toolbar--scroll">
        {multi && (
          <ClassFilter
            value={picked}
            onChange={setPicked}
            classes={classes}
            allLabel={allClassesLabel}
          />
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
