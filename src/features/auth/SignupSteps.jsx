import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'

/** Step 1 — the phone lookup. */
export function SignupPhoneStep({ phone, setPhone, errors, busy, onSubmit }) {
  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
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
  )
}

/** Step 2 — choose and confirm the password. */
export function SignupPasswordStep({
  phone,
  who,
  password,
  setPassword,
  confirm,
  setConfirm,
  errors,
  busy,
  onSubmit,
  onBack,
}) {
  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
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

      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        تغيير الرقم
      </Button>
    </form>
  )
}
