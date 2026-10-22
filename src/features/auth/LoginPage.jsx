import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { AuthBrand } from './AuthBrand'
import { AuthSupport } from './AuthSupport'
import { AuthTabs } from './AuthTabs'
import { useLogin } from './useLogin'
import './login.css'

export default function LoginPage() {
  usePageTitle('تسجيل الدخول')
  const { isAuthenticated } = useAuth()
  const form = useLogin()
  const { identifier, setIdentifier, password, setPassword, errors, formError, pendingHandle, busy } = form

  if (isAuthenticated) return <Navigate to="/" replace />

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

          <form className="stack" onSubmit={form.submit} noValidate>
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
