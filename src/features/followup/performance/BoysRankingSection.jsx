import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Tabs } from '../../../components/ui/Toolbar'
import { Table } from '../../../components/ui/Table'
import { EmptyState } from '../../../components/ui/States'
import { followLabel } from '../../boys/BoyProfile'
import { DashSection } from '../../dashboard/parts'
import { formatShort } from '../../../lib/format'
import { uniqueFollowHistory } from './followHistoryUtils'

/** Expanded row: the boy's recent follow-ups, newest first. */
function HistoryPanel({ row, onOpenBoy }) {
  return (
    <div className="fu-history">
      <ul className="fu-history__list">
        {uniqueFollowHistory(row.history).map((h) => (
          <li key={h.id ?? `${h.date}-${h.status}-${h.teacher_id}`}>
            <span className="fu-history__date">{formatShort(h.date)}</span>
            <Badge kind="navy">{followLabel(h.status)}</Badge>
            <span className="muted small">{h.teacher_name}</span>
            {h.note && <span className="fu-history__note">{h.note}</span>}
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" onClick={() => onOpenBoy(row)}>
        عرض الملف
      </Button>
    </div>
  )
}

/** The ranked boys list, filtered by the todo/done/all tabs. */
export function BoysRankingSection({
  totals,
  tab,
  setTab,
  ranking,
  fromLabel,
  columns,
  expanded,
  onOpenBoy,
}) {
  return (
    <DashSection
      title="ترتيب الأولاد"
      hint={`${ranking.length} ولد — افتقادات الفترة من ${fromLabel}.`}
      control={
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'todo', label: 'لم يُفتقدوا', count: totals.not_followed },
            { value: 'done', label: 'افتقدوا', count: totals.followed },
            { value: 'all', label: 'الكل', count: totals.boys },
          ]}
        />
      }
    
    >
      {ranking.length === 0 ? (
        <EmptyState
          icon="heart"
          title={tab === 'todo' ? 'لا يوجد متبقون' : 'لا توجد نتائج'}
          message={
            tab === 'todo'
              ? 'كل الأولاد تم افتقادهم خلال الفترة المختارة.'
              : 'جرّب تغيير الفلتر أو الفترة.'
          }
          inline
        />
      ) : (
        <Table
          columns={columns}
          rows={ranking}
          rowKey={(r) => r.boy_id}
          rowClassName={(r) => (r.followed ? 'is-followed' : '')}
          renderExpanded={(r) =>
            expanded === r.boy_id ? <HistoryPanel row={r} onOpenBoy={onOpenBoy} /> : null
          }
          sortable
          stackOnMobile
          compact
        />
      )}
    </DashSection>
  )
}
