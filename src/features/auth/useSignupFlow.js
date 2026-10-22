import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ApiError } from '../../lib/api'
import { AuthAPI } from '../../lib/endpoints'
import { isPhone, normalisePhone } from '../../lib/constants'

/** The two-step (phone → password) signup state machine. */
export function useSignupFlow() {
  const { loginWithToken } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('phone')
  // Prefilled when we arrive from login with a phone that has no password yet.
  const [phone, setPhone] = useState(location.state?.phone || '')
  const [who, setWho] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

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

  const backToPhone = () => {
    setStep('phone')
    setFormError('')
    setErrors({})
  }

  return {
    step,
    phone,
    setPhone,
    who,
    password,
    setPassword,
    confirm,
    setConfirm,
    errors,
    formError,
    busy,
    checkPhone,
    setPasswordNow,
    backToPhone,
  }
}
