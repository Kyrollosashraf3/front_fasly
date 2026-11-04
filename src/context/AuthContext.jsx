import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '../lib/api'
import { AuthAPI, ClassAPI, BoyAPI, TeacherAPI } from '../lib/endpoints'
import { listenForResubscribe, syncPush } from '../lib/push'
import { can, isBoy, isGeneralAdmin, isManager, isServant, isSuperAdmin } from '../lib/roles'

const AuthContext = createContext(null)

/**
 * AuthContext — session + identity + the class catalogue.
 *
 * Flow: login() posts the token, then loads `me` and resolves which classes
 * this login may open (super_admin: all; a stage amin: the group handed to his
 * account; admin, servant and boy - only the class he belongs to).
 * `classes` is cached here so every screen shares one request.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready
  const [classReady, setClassReady] = useState(false)
  const bootstrapRef = useRef(false)

  /**
   * Which classes does this login belong to? (null = he sees every class)
   * Only a super_admin is class-less. A stage amin is handed a group on his
   * account (`managed_class_ids`, already inside `/auth/me`); an admin is
   * attached to a servant and a servant/boy to his own class, so their answer
   * comes from the owner link.
   */
  const resolveMyClasses = useCallback(async (me) => {
    if (!me || isSuperAdmin(me)) return null
    if (isGeneralAdmin(me)) return me.managed_class_ids || []
    try {
      if (me.teacher_id) {
        const t = await TeacherAPI.get(me.teacher_id)
        return t?.class_id ? [t.class_id] : []
      }
      if (me.boy_id) {
        const b = await BoyAPI.get(me.boy_id)
        return b?.class_id ? [b.class_id] : []
      }
    } catch {
      return []
    }
    return []
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
        const mine = await resolveMyClasses(me)
        const scoped = all.filter((c) => mine.includes(c.id))
        setClasses(scoped)
        return scoped
      } catch {
        setClasses([])
        return []
      } finally {
        setClassReady(true)
      }
    },
    [resolveMyClasses],
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
      // A servant may live outside every class (future stage amin /
      // church-wide role) - his row then carries ``class_id: null``.
      classLabel: (id) =>
        id == null || id === ''
          ? 'بدون فصل'
          : classMap.get(Number(id))?.name || `صف ${id}`,
      canAccess: (id) => classMap.has(Number(id)),
      // role helpers, so screens never touch role strings
      isManager: isManager(user),
      isSuperAdmin: isSuperAdmin(user),
      isGeneralAdmin: isGeneralAdmin(user),
      /** Worth showing a class picker: an amin whose reach holds several classes. */
      canPickClass: isManager(user) && classes.length > 1,
      /** What "no class chosen" is called for this login — the church's classes or his own. */
      allClassesLabel: isSuperAdmin(user) ? 'كل الفصول' : 'فصولي',
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
