import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { AuthBrand } from './AuthBrand'
import { AuthSupport } from './AuthSupport'
import { AuthTabs } from './AuthTabs'
import { SignupPasswordStep, SignupPhoneStep } from './SignupSteps'
import { useSignupFlow } from './useSignupFlow'
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
  const { isAuthenticated } = useAuth()
  const flow = useSignupFlow()
  const { step, phone, setPhone, who, password, setPassword, confirm, setConfirm, errors, formError, busy } = flow

  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="login">
      <AuthBrand />

      <main className="login__panel">
        <div className="login__box">
          <AuthTabs />
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
            <SignupPhoneStep
              phone={phone}
              setPhone={setPhone}
              errors={errors}
              busy={busy}
              onSubmit={flow.checkPhone}
            />
          ) : (
            <SignupPasswordStep
              phone={phone}
              who={who}
              password={password}
              setPassword={setPassword}
              confirm={confirm}
              setConfirm={setConfirm}
              errors={errors}
              busy={busy}
              onSubmit={flow.setPasswordNow}
              onBack={flow.backToPhone}
            />
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

          <AuthSupport />
        </div>
      </main>
    </div>
  )
}
