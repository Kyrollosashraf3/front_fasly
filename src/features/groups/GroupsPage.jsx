import { usePageTitle } from '../../context/TitleContext'
import { GroupAPI } from '../../lib/endpoints'
import { ErrorState, SkeletonRows } from '../../components/ui/States'
import { FileMenu } from '../../components/ui/FileMenu'
import { ImportResult } from '../../components/ui/ImportResult'
import { BoyProfileModal } from '../boys/BoyProfile'
import { AssignGame } from './AssignGame'
import { GroupToolbar } from './GroupToolbar'
import { GroupCards } from './GroupCards'
import { BoyMoveModal } from './BoyMoveModal'
import { useGroups } from './useGroups'
import './groups.css'

/**
 * GroupsPage — servant follow-up assignments.
 *
 * Filter by class / servant / boy, toggle edit mode to remove a boy from a
 * group or move him to another servant.
 */
export default function GroupsPage() {
  usePageTitle('المجموعات')

  const groups = useGroups()
  const {
    data,
    loading,
    error,
    refetch,
    canWrite,
    effectiveClassId,
    assigning,
    viewing,
    setViewing,
    importResult,
    setImportResult,
    moveBoy,
    importFile,
    editing,
    selectedBoy,
    selectedTeacherId,
  } = groups

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">المجموعات</h1>
          <div className="page-head__sub">
            {data
              ? `${data.groups.length} مجموعة · ${data.unassigned_count} بدون مجموعة`
              : 'توزيع الأولاد على الخدام'}
          </div>
        </div>

        <FileMenu
          label="إكسل"
          items={[
            {
              key: 'export',
              label: 'تصدير شيت التوزيع',
              icon: 'download',
              onClick: () => GroupAPI.export(effectiveClassId),
            },
            canWrite && {
              key: 'import',
              label: 'رفع شيت توزيع',
              icon: 'upload',
              fileInput: true,
              onFile: importFile,
            },
          ].filter(Boolean)}
        />
      </div>

      <GroupToolbar groups={groups} isSuperAdmin={groups.isSuperAdmin} canWrite={canWrite} />

      {loading ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <SkeletonRows rows={6} cols={6} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          {canWrite && !editing && !selectedBoy && !selectedTeacherId && (
            <AssignGame
              groups={data?.groups || []}
              boys={data?.unassigned || []}
              assigning={assigning}
              onAssign={groups.assign}
              classIdForEdit={effectiveClassId}
              onSaved={refetch}
            />
          )}

          <GroupCards groups={groups} />
        </>
      )}

      <BoyProfileModal
        open={Boolean(viewing)}
        // group rows carry `boy_id`; the profile modal (and its dashboard
        // history request) wants the plain `id`.
        boy={viewing ? { ...viewing, id: viewing.boy_id, class_id: viewing.class_id ?? Number(effectiveClassId) } : null}
        onClose={() => setViewing(null)}
      />

      <ImportResult
        open={Boolean(importResult)}
        result={importResult}
        onClose={() => setImportResult(null)}
        noun="التوزيع"
      />

      <BoyMoveModal
        boy={groups.boyMove}
        teachers={groups.teachers}
        onMove={moveBoy}
        onClose={() => groups.setBoyMove(null)}
      />
    </>
  )
}
