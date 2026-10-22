import { Modal } from '../components/ui/Modal'

/** Save / discard / stay prompt for a pending navigation. */
export function UnsavedGuardDialog({ pending, saving, onStay, onDiscard, onSave }) {
  return (
    <Modal
      open={Boolean(pending)}
      size="sm"
      title="فيه تعديلات لم تُحفظ"
      onClose={() => !saving && onStay()}
      footer={
        <>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onStay}>
            رجوع
          </button>
          <button
            type="button"
            className="btn-link btn-link--danger"
            disabled={saving}
            onClick={onDiscard}
          >
            تجاهل
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>
            {saving ? 'جاري الحفظ...' : 'حفظ والمتابعة'}
          </button>
        </>
      }
    >
      <p className="muted">
        {pending?.message || 'لسه فيه تعديلات لم تُحفظ. تحب تحفظها قبل ما تسيب الصفحة؟'}
      </p>
    </Modal>
  )
}
