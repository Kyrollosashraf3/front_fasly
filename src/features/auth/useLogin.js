import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ApiError } from '../../lib/api'
import { AuthAPI } from '../../lib/endpoints'
import { isPhone, normalisePhone } from '../../lib/constants'

/** Login form state, validation and the 401 → signup-lookup fallback. */
export function useLogin() {
  const { login } = useAuth()
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

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    errors,
    formError,
    pendingHandle,
    busy,
    submit,
  }
}
