import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePageTitle } from '../../context/TitleContext'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api'
import { AuthAPI } from '../../lib/endpoints'
import { isPhone, normalisePhone } from '../../lib/constants'
import { AuthBrand } from './AuthBrand'
import { AuthSupport } from './AuthSupport'
import { AuthTabs } from './AuthTabs'
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
  // Set when the number is on file but still has no password — we then nudge
  // the person to finish signing up instead of just showing "wrong password".
  const [pendingHandle, setPendingHandle] = useState('')
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
    setPendingHandle('')
    if (!validate()) return

    const handle = normalisePhone(identifier)

    setBusy(true)
    try {
      await login(handle, password)
      toast.success('مرحبًا بعودتك.')
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // The API answers "wrong phone OR wrong password" with a single 401
          // so it can't be used to probe which numbers exist. Ask the signup
          // lookup which of the two it really was, to show a kinder message.
          try {
            const res = await AuthAPI.signupCheck(handle)
            if (!res.exists) {
              setFormError('الرقم ده مش مسجّل عندنا. كلّم أمين الفصل يضيف حسابك.')
            } else if (res.needs_signup) {
              // Account on file but no password yet — point them at sign-up.
              setPendingHandle(handle)
            } else {
              setFormError('رقم التليفون أو كلمة المرور مش صح.')
            }
          } catch {
            setFormError('رقم التليفون أو كلمة المرور مش صح.')
          }
        } else if (err.status === 429) {
          setFormError('طلبات كثيرة جدًا. انتظر قليلًا قبل ما تجرّب تاني.')
        } else {
          setFormError(err.message)
        }
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
          <AuthTabs />
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

            {pendingHandle && (
              <div className="login__note" role="status">
                <p className="login__note-text">
                  الرقم <b dir="ltr">{pendingHandle}</b> عليه حساب بالفعل بس لسه من غير كلمة
                  مرور. اضغط «سجّل برقمك»، دخل واختار باسورد.
                </p>
                <Link
                  to="/signup"
                  state={{ phone: pendingHandle }}
                  className="btn btn-primary btn-block"
                >
                  سجّل برقمك
                </Link>
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

          {/* Below the form: a clear box that moves the person to activation. */}
          <Link to="/signup" className="login__cta">
            <Icon name="sparkles" size={18} />
            <span className="login__cta-text">
              <b>فعل حسابك أولاً</b>
              <span>سجّل برقمك</span>
            </span>
            <Icon name="chevronStart" size={16} />
          </Link>

          <div className="login__hint">
            <Icon name="lock" size={14} />
            <span>
              الحساب بيتوفّر من أمين الفصل أو الأدمن العام.{' '}
              <Link to="/signup" className="login__link">
                سجّل برقمك
              </Link>
            </span>
          </div>

          <AuthSupport />
        </div>
      </main>
    </div>
  )
}
