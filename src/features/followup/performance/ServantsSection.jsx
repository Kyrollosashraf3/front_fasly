import { useState } from 'react'
import { Table } from '../../../components/ui/Table'
import { SearchInput } from '../../../components/ui/Field'
import { EmptyState } from '../../../components/ui/States'
import { DashSection } from '../../dashboard/parts'
import { servantColumns } from './columns'
import { ServantMissedModal } from './ServantMissedModal'

/**
 * ServantsSection — the per-servant follow-up table.
 *
 * Two clickable counts per servant: the boys of his own group he followed and
 * the boys outside it. Either count opens the same history card with the names,
 * the last contact and the recorded follow-ups; the outside card also names the
 * boy's own group servant so the amin knows who is responsible for him.
 */
export function ServantsSection({ data, servantRows, servantSearch, setServantSearch }) {
  const [modal, setModal] = useState(null)

  const openBoys = (servant, kind) => {
    const outside = kind === 'outside'
    const boys = (outside ? servant.boys_outside : servant.boys_inside) || []
    setModal({
      servant,
      boys,
      kind,
      title: outside
        ? `أولاد خارج مجموعة ${servant.teacher_name}`
        : `أولاد مجموعة ${servant.teacher_name}`,
      sub: outside
        ? `${boys.length} ولد افتقدهم خارج مجموعته في الفترة المختارة`
        : `${boys.length} ولد افتقدهم داخل مجموعته في الفترة المختارة`,
    })
  }

  return (
    <DashSection
      title="أداء الخدام"
      hint="اضغط على أي عدد لعرض الأولاد وسجل افتقاد كل ولد."
      control={
        <SearchInput
          value={servantSearch}
          onChange={setServantSearch}
          placeholder="ابحث باسم الخادم..."
        />
      }
    >
      <Table
        columns={servantColumns(data, { onOpenBoys: openBoys })}
        rows={servantRows}
        rowKey={(s) => s.teacher_id}
        stackOnMobile
        sortable
      />
      {servantRows.length === 0 && (
        <EmptyState
          icon="servant"
          title="لا يوجد خدام مطابقون"
          message="جرّب اسمًا آخر أو امسح مربع البحث."
        />
      )}

      <ServantMissedModal
        servant={modal?.servant}
        boys={modal?.boys}
        title={modal?.title}
        sub={modal?.sub}
        showGroupServant={modal?.kind === 'outside'}
        onClose={() => setModal(null)}
      />
    </DashSection>
  )
}
