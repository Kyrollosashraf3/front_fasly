import { useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { Badge } from './Badge'
import { Icon } from './Icon'
import { Modal } from './Modal'

/**
 * ImportResult — the one place an Excel import summary is shown.
 * (The old frontend copy-pasted this modal three times.)
 *
 *   <ImportResult open result={summary} onClose={close} noun="الأولاد" />
 *
 * `result` shape: { total_rows, created_count, failed_count, created[], failed[] }
 */
export function ImportResult({ open, result, onClose, noun = 'السجلات' }) {
  const toast = useToast()

  useEffect(() => {
    if (!open || !result) return
    if (result.failed_count > 0) toast.warning(`اتضاف ${result.created_count} وفشل ${result.failed_count}.`)
    else toast.success(`تم استيراد ${result.created_count} من ملف الإكسل.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result])

  if (!result) return null

  const { created_count = 0, failed_count = 0, total_rows = 0, failed = [] } = result

  return (
    <Modal
      open={open}
      title="نتيجة الاستيراد"
      sub={`عدد الصفوف في الملف: ${total_rows}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          تم
        </button>
      }
    >
      <div className="import-result">
        <div className="import-result__stats">
          <Badge kind="green">تم إضافة {created_count}</Badge>
          {failed_count > 0 && <Badge kind="red">فشل {failed_count}</Badge>}
          <Badge kind="neutral">الإجمالي {total_rows}</Badge>
        </div>

        {failed_count > 0 ? (
          <>
            <p className="small muted">الصفوف اللي ماعتبتتش:</p>
            <div className="import-result__list">
              {failed.map((f, i) => (
                <div className="import-result__row" key={i}>
                  <span className="import-result__rowno">
                    {f.row ? `صف ${f.row}:` : '—'}
                  </span>
                  <span className="grow">
                    <strong>{f.boy_name || f.teacher_name || f.phone || ''}</strong> {f.error}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="row small muted" style={{ gap: 6 }}>
            <Icon name="check" size={16} />
            كل الصفوف اتضافت بدون أخطاء في {noun}.
          </p>
        )}
      </div>
    </Modal>
  )
}
