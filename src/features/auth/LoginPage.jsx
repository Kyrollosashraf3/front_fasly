import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api'
import './login.css'

export default function LoginPage() {
  usePageTitle('تسجيل الدخول')
  const { login, isAuthenticated } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const validate = () => {
    const next = {}
    if (!email.trim()) next.email = 'البريد الإلكتروني مطلوب.'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next.email = 'البريد الإلكتروني غير صحيح.'
    if (!password) next.password = 'كلمة المرور مطلوبة.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setBusy(true)
    try {
      await login(email.trim(), password)
      toast.success('مرحبًا بعودتك.')
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(
          err.status === 429
            ? 'طلبات كثيرة جدًا. انتظر قليلًا قبل ما تجرّب تاني.'
            : err.message,
        )
      } else {
        setFormError('حصل خطأ. حاول مرة أخرى.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      {/* Brand panel — the visual signature of the app. */}
      <aside className="login__brand">
        <div className="login__mark">ف</div>
        <h1 className="login__wordmark">فصلي</h1>
        <div className="login__rule" />
        <p className="login__tagline">
          نظام إدارة مدارس الأحد — الحضور، الافتقاد، ومتابعة الخدام في مكان واحد.
        </p>

        <ul className="login__points">
          <li>
            <Icon name="calendar" size={17} /> حضور الجمعة بضغطة واحدة
          </li>
          <li>
            <Icon name="heart" size={17} /> سجل افتقاد أسبوعي لكل خادم
          </li>
          <li>
            <Icon name="chart" size={17} /> لوحة متابعة الأداء والغياب المتكرر
          </li>
        </ul>
      </aside>

      {/* Form panel */}
      <main className="login__panel">
        <div className="login__box">
          <div className="login__box-head">
            <span className="login__mobile-mark">ف</span>
            <h2>مرحبًا بعودتك</h2>
            <p className="muted small">سجّل الدخول عشان تكمل.</p>
          </div>

          <form className="stack" onSubmit={submit} noValidate>
            {formError && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} />
                <span>{formError}</span>
              </div>
            )}

            <Field label="البريد الإلكتروني" required htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                placeholder="name@example.com"
                value={email}
                error={errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="كلمة المرور" required htmlFor="password" error={errors.password}>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                error={errors.password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" size="lg" block loading={busy}>
              {busy ? 'جارٍ الدخول...' : 'دخول'}
            </Button>
          </form>

          <div className="login__hint">
            <Icon name="lock" size={14} />
            الحساب بيتوفّر من أمين الفصل أو الأدمن العام.
          </div>
        </div>
      </main>
    </div>
  )
}
