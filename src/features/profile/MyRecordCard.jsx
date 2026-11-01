import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { DetailRow } from '../../components/ui/Bits'
import { ErrorState, Loading } from '../../components/ui/States'
import { calcAge, formatDate } from '../../lib/format'

/**
 * «بياناتي» — the servant's own directory row, the same fields he may edit
 * himself. The phone and the class stay on the account card above.
 */
export function MyRecordCard({ record, loading, error, onRetry, onEdit }) {
  const age = record ? calcAge(record.birth_date) : null

  return (
    <div className="card my-record">
      <div className="card__head">
        <h3 className="card__title">بياناتي</h3>
        {record && (
          <Button size="sm" icon={<Icon name="edit" size={15} />} onClick={onEdit}>
            تعديل بياناتي
          </Button>
        )}
      </div>

      <div className="card__body">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} title="تعذر تحميل بياناتك" />
        ) : loading ? (
          <Loading label="جارٍ تحميل بياناتك..." />
        ) : record ? (
          <div className="details">
            <DetailRow label="الاسم">{record.teacher_name || '—'}</DetailRow>
            <DetailRow label="تاريخ الميلاد">
              {record.birth_date ? formatDate(record.birth_date) : '—'}
            </DetailRow>
            <DetailRow label="السن">{age ? `${age} سنة` : '—'}</DetailRow>
            <DetailRow label="آخر اعتراف">
              {record.last_visit_date ? formatDate(record.last_visit_date) : 'لسه اتسجلش'}
            </DetailRow>
            <DetailRow label="أبونا الاعتراف">{record.father_name || '—'}</DetailRow>
            <DetailRow label="المنطقة/الشارع">{record.zone || '—'}</DetailRow>
            <DetailRow label="عنوان المنزل">{record.address || '—'}</DetailRow>
            <DetailRow label="المهارات">
              {record.skills?.length ? record.skills.join('، ') : '—'}
            </DetailRow>
            <DetailRow label="ملاحظة">{record.note || '—'}</DetailRow>
          </div>
        ) : null}
      </div>
    </div>
  )
}
