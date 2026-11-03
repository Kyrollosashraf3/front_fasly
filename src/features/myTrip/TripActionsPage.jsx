import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '../../context/TitleContext'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { ErrorState, Loading } from '../../components/ui/States'
import { TripAPI } from '../../lib/endpoints'
import { formatDate, num } from '../../lib/format'
import RegisterSubscription from './RegisterSubscription'
import SubscriptionAnalysis from './SubscriptionAnalysis'
import TripStatus from './TripStatus'
import BoyAccount from './BoyAccount'
import ServerAccountStatement from './ServerAccountStatement'
import './myTrip.css'

const ACTIONS = [
  {
    key: 'register',
    label: 'تسجيل اشتراك',
    hint: 'أضف دفعة لولد من فصلك',
    icon: 'plus',
  },
  {
    key: 'analysis',
    label: 'اشتراكات',
    hint: 'من دفع وكم بقي عليه',
    icon: 'list',
  },
  {
    key: 'status',
    label: 'حالة الرحلة',
    hint: 'المتوقع مقابل المحصّل',
    icon: 'chart',
  },
  {
    key: 'account',
    label: 'حساب ولد',
    hint: 'دفعات ولد واحد وتاريخها',
    icon: 'user',
  },
  {
    key: 'serverStatement',
    label: 'كشف حساب',
    hint: 'مجموع ما استلمه كل خادم',
    icon: 'servant',
  },
]

/**
 * TripActionsPage — the page a trip box opens.
 *
 * The four actions are laid out as page tiles, not inside a card. Choosing one
 * opens its own dialog, so the servant always lands on the trip first.
 */
export default function TripActionsPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState(null)

  usePageTitle(trip?.name || 'رحلتي')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTrip(await TripAPI.get(tripId))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  const action = useMemo(() => ACTIONS.find((item) => item.key === view) || null, [view])
  const back = () => navigate('/myTrip')
  const close = () => setView(null)

  return (
    <>
      <div className="page-head mytrip__head">
        <div>
          <Button variant="ghost" size="sm" className="mytrip__back" onClick={back}>
            <Icon name="chevronStart" size={15} />
            رحلتي
          </Button>
          {trip && (
            <div className="page-head__sub mytrip__trip-meta">
              <Badge kind={trip.status === 'inactive' ? 'neutral' : 'green'}>
                {String(trip.status || 'active').toUpperCase()}
              </Badge>
              <span>
                {formatDate(trip.created_at)} — {num(trip.cost)} جنيه للولد
              </span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Loading label="جارٍ تحميل الرحلة..." />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : (
        <div className="mytrip__detail">
          <div className="mytrip__detail-cost">
            <span>قيمة اشتراك الرحلة</span>
            <strong>{num(trip.cost)} جنيه</strong>
          </div>

          <div className="mytrip__actions mytrip__actions--page">
            {ACTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="mytrip__action"
                onClick={() => setView(item.key)}
              >
                <span className="mytrip__action-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="mytrip__action-text">
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {action && trip && (
        <Modal
          open
          onClose={close}
          size={action.key === 'register' ? 'md' : 'lg'}
          title={action.label}
          sub={trip.name}
          footer={
            action.key === 'register' ? null : (
              <Button variant="secondary" onClick={close}>
                إغلاق
              </Button>
            )
          }
        >
          {action.key === 'register' && (
            <RegisterSubscription trip={trip} onSaved={close} onClose={close} />
          )}

          {action.key === 'analysis' && <SubscriptionAnalysis tripId={trip.id} />}

          {action.key === 'status' && (
            <TripStatus tripId={trip.id} tripCost={trip.cost} tripName={trip.name} />
          )}

          {action.key === 'account' && <BoyAccount tripId={trip.id} />}

          {action.key === 'serverStatement' && (
            <ServerAccountStatement tripId={trip.id} />
          )}
        </Modal>
      )}
    </>
  )
}
