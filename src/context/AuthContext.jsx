import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '../lib/api'
import { AuthAPI, ClassAPI, BoyAPI, TeacherAPI } from '../lib/endpoints'
import { listenForResubscribe, syncPush } from '../lib/push'
import { can, isBoy, isManager, isServant, isSuperAdmin } from '../lib/roles'

const AuthContext = createContext(null)

/**
 * AuthContext — session + identity + the class catalogue.
 *
 * Flow: login() posts the token, then loads `me` and resolves which classes
 * this login may open (super_admin: all; everyone else - admin, servant and
 * boy alike - only the class he belongs to).
 * `classes` is cached here so every screen shares one request.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready
  const [classReady, setClassReady] = useState(false)
  const bootstrapRef = useRef(false)

  /**
   * Which class does this login belong to? (null = he sees every class)
   * Only a super_admin is class-less: an admin is attached to a servant and
   * a servant/boy to his own class, so the answer comes from the owner link.
   */  const resolveMyClass = useCallback(async (me) => {
    if (!me || isSuperAdmin(me)) return null
    try {
      if (me.teacher_id) {
        const t = await TeacherAPI.get(me.teacher_id)
        return t?.class_id ?? null
      }
      if (me.boy_id) {
        const b = await BoyAPI.get(me.boy_id)
        return b?.class_id ?? null
      }
    } catch {
      return null
    }
    return null
  }, [])

  /** Loads /classes and narrows it to what this login may open. */
  const syncClasses = useCallback(
    async (me) => {
      setClassReady(false)
      try {
        const all = await ClassAPI.list()
        if (!me || isSuperAdmin(me)) {
          setClasses(all)
          return all
        }
        const classId = await resolveMyClass(me)
        const mine = classId ? all.filter((c) => c.id === classId) : []
        setClasses(mine)
        return mine
      } catch {
        setClasses([])
        return []
      } finally {
        setClassReady(true)
      }
    },
    [resolveMyClass],
  )

  const bootstrap = useCallback(
    async (token) => {
      setToken(token)
      const me = await AuthAPI.me()
      setUser(me)
      await syncClasses(me)
      return me
    },
    [syncClasses],
  )

  /**
   * A subscription belongs to the phone, not to the login: signing in here
   * re-registers whichever browser this is under the account now using it, so a
   * shared phone follows the servant holding it instead of the last one who did.
   */
  useEffect(() => {
    if (user) syncPush().catch(() => {})
  }, [user])

  /** The push service rotated our subscription while the app was open. */
  useEffect(() => listenForResubscribe(), [])

  /** Restore an existing session on first mount. */
  useEffect(() => {
    if (bootstrapRef.current) return
    bootstrapRef.current = true
    const token = getToken()
    if (!token) {
      setStatus('ready')
      return
    }
    AuthAPI.me()
      .then((me) => {
        setUser(me)
        return syncClasses(me)
      })
      .catch(() => clearToken())
      .finally(() => setStatus('ready'))
  }, [syncClasses])

  // A 401 from anywhere in the app ends the session exactly once.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setClasses([])
      setClassReady(false)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(
    async (identifier, password) => {
      const { access_token } = await AuthAPI.login(identifier, password)
      return bootstrap(access_token)
    },
    [bootstrap],
  )

  /** The signup screen already holds a token - open the session with it. */
  const loginWithToken = useCallback(
    async (access_token) => bootstrap(access_token),
    [bootstrap],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setClasses([])
    setClassReady(false)
  }, [])

  const refreshClasses = useCallback(() => syncClasses(user), [syncClasses, user])
  const refreshUser = useCallback(
    () => AuthAPI.me().then(setUser).catch(() => {}),
    [],
  )

  const value = useMemo(() => {
    const classMap = new Map(classes.map((c) => [c.id, c]))
    return {
      user,
      classes,
      classReady,
      ready: status === 'ready',
      isAuthenticated: Boolean(user),
      login,
      loginWithToken,
      logout,
      refreshClasses,
      refreshUser,
      classOf: (id) => classMap.get(Number(id)),
      classLabel: (id) => classMap.get(Number(id))?.name || `صف ${id}`,
      canAccess: (id) => classMap.has(Number(id)),
      // role helpers, so screens never touch role strings
      isManager: isManager(user),
      isSuperAdmin: isSuperAdmin(user),
      isServant: isServant(user),
      isBoy: isBoy(user),
      can,
    }
  }, [user, classes, classReady, status, login, loginWithToken, logout, refreshClasses, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
