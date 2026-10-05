import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
import './login.css'

/**
 * SignUpPage — the owner finishes the account an administrator created.
 *
 *   step 1  the phone number  -> /auth/signup/check  (is it on file?)
 *   step 2  password + confirm -> /auth/signup        (sets it, returns a token)
 *
 * Nothing here creates an account: the row must already exist, which is why
 * an unknown number is a dead end and not a registration form.
 */
export default function SignUpPage() {
  usePageTitle('إنشاء كلمة المرور')
  const { loginWithToken, isAuthenticated } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState('phone') // phone | password
  const [phone, setPhone] = useState('')
  const [who, setWho] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const showFormError = (err) => {
    if (!(err instanceof ApiError)) return setFormError('حصل خطأ. حاول مرة أخرى.')
    if (err.status === 404) {
      setFormError('الرقم ده مش مسجّل عندنا. كلّم أمين الفصل يضيف حسابك.')
      setStep('phone')
      return
    }
    if (err.status === 409) {
      setFormError('الرقم ده عنده كلمة مرور بالفعل. ادخل من صفحة الدخول.')
      setStep('phone')
      return
    }
    setFormError(
      err.status === 429 ? 'طلبات كثيرة جدًا. انتظر قليلًا وحاول تاني.' : err.message,
    )
  }

  const checkPhone = async (e) => {
    e.preventDefault()
    setFormError('')
    const value = normalisePhone(phone)
    if (!isPhone(value)) {
      setErrors({ phone: 'رقم التليفون غير صحيح (01xxxxxxxxx).' })
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await AuthAPI.signupCheck(value)
      if (!res.exists) {
        setFormError('الرقم ده مش مسجّل عندنا. كلّم أمين الفصل يضيف حسابك.')
        return
      }
      if (!res.needs_signup) {
        setFormError('الرقم ده عنده كلمة مرور بالفعل. ادخل من صفحة الدخول.')
        return
      }
      setPhone(value)
      setWho(res)
      setStep('password')
    } catch (err) {
      showFormError(err)
    } finally {
      setBusy(false)
    }
  }

  const setPasswordNow = async (e) => {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (password.length < 8) next.password = 'كلمة المرور 8 حروف على الأقل.'
    if (password !== confirm) next.confirm = 'كلمتا المرور مش متطابقتين.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const { access_token } = await AuthAPI.signup({
        phone,
        password,
        password_confirm: confirm,
      })
      await loginWithToken(access_token)
      toast.success('تم إنشاء كلمة المرور. أهلًا بيك.')
      navigate('/', { replace: true })
    } catch (err) {
      showFormError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <AuthBrand />

      <main className="login__panel">
        <div className="login__box">
          <div className="login__box-head">
            <span className="login__mobile-mark">ف</span>
            <h2>سجّل برقمك</h2>
            <p className="muted small">
              {step === 'phone'
                ? 'اكتب رقم تليفونك عشان نتأكد إن حسابك موجود.'
                : 'اختر كلمة مرورك وتأكيدها.'}
            </p>
          </div>

          <div className="login__stepper" aria-hidden="true">
            <span className={`login__step ${step === 'phone' ? 'is-active' : ''}`}>
              <i>1</i> الرقم
            </span>
            <Icon name="chevron" size={14} />
            <span className={`login__step ${step === 'password' ? 'is-active' : ''}`}>
              <i>2</i> كلمة المرور
            </span>
          </div>

          {formError && (
            <div className="form-error" role="alert">
              <Icon name="alert" size={16} />
              <span>{formError}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form className="stack" onSubmit={checkPhone} noValidate>
              <Field label="رقم التليفون" required htmlFor="su-phone" error={errors.phone}>
                <Input
                  id="su-phone"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01012345678"
                  value={phone}
                  error={errors.phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" size="lg" block loading={busy}>
                {busy ? 'جارٍ التحقق...' : 'متابعة'}
              </Button>
            </form>
          ) : (
            <form className="stack" onSubmit={setPasswordNow} noValidate>
              <div className="login__who">
                <Icon name="phone" size={16} />
                <span>
                  {who?.display_name ? `${who.display_name} — ` : ''}
                  <b dir="ltr">{phone}</b>
                </span>
              </div>

              <Field
                label="كلمة المرور"
                required
                hint="8 حروف على الأقل"
                htmlFor="su-pass"
                error={errors.password}
              >
                <Input
                  id="su-pass"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  error={errors.password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Field label="تأكيد كلمة المرور" required htmlFor="su-confirm" error={errors.confirm}>
                <Input
                  id="su-confirm"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  error={errors.confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" size="lg" block loading={busy}>
                {busy ? 'جارٍ الحفظ...' : 'إنشاء كلمة المرور'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('phone')
                  setFormError('')
                  setErrors({})
                }}
              >
                تغيير الرقم
              </Button>
            </form>
          )}

          <div className="login__hint">
            <Icon name="lock" size={14} />
            <span>
              عندك حساب بالفعل؟{' '}
              <Link to="/login" className="login__link">
                سجّل الدخول
              </Link>
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
