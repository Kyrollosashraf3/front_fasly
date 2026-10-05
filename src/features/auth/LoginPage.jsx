import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api'
import { isPhone, normalisePhone } from '../../lib/constants'
import { AuthBrand } from './AuthBrand'
import './login.css'

export default function LoginPage() {
  usePageTitle('تسجيل الدخول')
  const { login, isAuthenticated } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const validate = () => {
    const next = {}
    const value = identifier.trim()
    if (!value) next.identifier = 'رقم التليفون مطلوب.'
    else if (!isPhone(value)) next.identifier = 'اكتب رقم تليفون صحيح (01xxxxxxxxx).'
    if (!password) next.password = 'كلمة المرور مطلوبة.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    const handle = normalisePhone(identifier)

    setBusy(true)
    try {
      await login(handle, password)
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
      <AuthBrand />

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

            <Field label="رقم التليفون" required htmlFor="identifier" error={errors.identifier}>
              <Input
                id="identifier"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01012345678"
                value={identifier}
                error={errors.identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
            <span>
              الحساب بيتوفّر من أمين الفصل أو الأدمن العام.{' '}
              <Link to="/signup" className="login__link">
                سجّل برقمك
              </Link>
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
