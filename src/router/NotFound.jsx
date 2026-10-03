import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/States'
import { usePageTitle } from '../context/TitleContext'

export default function NotFound() {
  usePageTitle('مش موجود')
  return (
    <div style={{ paddingTop: 40 }}>
      <EmptyState
        icon="alert"
        title="الصفحة مش موجودة"
        message="الرابط ده مش صحيح أو اتحذف. ارجع للرئيسية."
        action={
          <Link to="/" className="btn btn-primary">
            الرئيسية
          </Link>
        }
      />
    </div>
  )
}
