import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useToast } from '../../context/ToastContext'

/** Dialog that moves a boy to another servant's group. */
export function BoyMoveModal({ boy, teachers = [], onMove, onClose }) {
  const toast = useToast()
  const [toTeacherId, setToTeacherId] = useState('')
  const [saving, setSaving] = useState(false)

  if (!boy) return null

  const options = teachers
    .filter((t) => !boy.inGroup || String(t.id) !== String(boy.teacher_id))
    .map((t) => ({ value: t.id, label: t.name }))

  const submit = async () => {
    if (!toTeacherId) {
      toast.error('اختار الخادم الأول')
      return
    }
    setSaving(true)
    const ok = await onMove?.(boy, toTeacherId)
    setSaving(false)
    if (ok !== false) onClose?.()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal__head">
          <div>
            <div className="modal__title">نقل الولد لمجموعة أخرى</div>
            <div className="modal__sub">
              {boy.boy_name} ·{' '}
              {boy.inGroup ? `حالياً في مجموعة: ${boy.group}` : 'حالياً بدون مجموعة'}
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__body">
          <SearchSelect
            value={toTeacherId}
            onChange={setToTeacherId}
            options={options}
            placeholder="اختر الخادم..."
            searchPlaceholder="ابحث باسم الخادم..."
            ariaLabel="نقل إلى خادم"
            style={{ width: '100%' }}
          />
        </div>
        <div className="modal__foot">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" loading={saving} onClick={submit} icon={<Icon name="check" size={15} />}>
            نقل
          </Button>
        </div>
      </div>
    </div>
  )
}
