import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/TitleContext'
import { Icon } from '../../components/ui/Icon'
import { Button, IconButton } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { TripAPI } from '../../lib/endpoints'
import { TripDialog } from './TripDialog'
import './myTrip.css'

/**
 * MyTripPage — "رحلتي".
 *
 * Trips are poster-like boxes, and each box shows its name only. Clicking a
 * box opens that trip's actions page; the amin gets a hover edit button to
 * change the trip itself. An amin who answers for more than one class can narrow
 * the catalogue to one of them, and a small footer button swaps the grid to the
 * inactive (old) trips.
 */
export default function MyTripPage() {
  usePageTitle('رحلتي')
  const { classes, isManager, canPickClass, allClassesLabel } = useAuth()
  const navigate = useNavigate()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The grid shows the active trips by default; the footer button toggles it.
  const [status, setStatus] = useState('active')
  // A class filter only appears for an amin whose reach holds several classes;
  // '' means every class he answers for.
  const [classId, setClassId] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)

  const viewingInactive = status === 'inactive'

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { status }
      if (classId) params.class_id = classId
      setTrips(await TripAPI.list(params))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [status, classId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const activeClass = useMemo(
    () => classes.find((c) => String(c.id) === classId),
    [classes, classId],
  )

  const openCreate = () => {
    setEditingTrip(null)
    setFormOpen(true)
  }

  const openEdit = (trip) => {
    setEditingTrip(trip)
    setFormOpen(true)
  }

  const handleSaved = () => {
    // A new trip is active, so leave the old-trips view to show it.
    if (!editingTrip && viewingInactive) {
      setStatus('active')
      return
    }
    refetch()
  }

  const countLabel = viewingInactive
    ? trips.length
      ? `${trips.length} رحلة قديمة`
      : 'لا توجد رحلات قديمة'
    : trips.length
      ? `${trips.length} رحلة نشطة`
      : 'الرحلات النشطة لفصلك'

  return (
    <>
      <div className="page-head mytrip__head">
        <div>
          <div className="page-head__sub">
            {countLabel}
            {activeClass ? ` — ${activeClass.name}` : ''}
          </div>
        </div>
        {isManager && (
          <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
            إضافة رحلة
          </Button>
        )}
      </div>

      {canPickClass && (
        <div className="mytrip__filterbar">
          <label className="mytrip__filter">
            <span className="mytrip__filter-label">اختر الفصل</span>
            <Select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="اختر الفصل"
              searchable
              searchPlaceholder="ابحث باسم الفصل..."
            >
              <option value="">{allClassesLabel}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      {loading ? (
        <Loading label="جارٍ تحميل الرحلات..." />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={viewingInactive ? 'history' : 'calendar'}
          title={viewingInactive ? 'لا توجد رحلات قديمة' : 'لا توجد رحلات نشطة'}
          message={
            viewingInactive
              ? 'لم تُوقَف أي رحلة قديمة لهذا الفصل بعد.'
              : 'لم تُسجَّل أي رحلة فعالة لفصلك بعد.'
          }
          action={
            viewingInactive ? (
              <Button variant="secondary" icon={<Icon name="chevronStart" size={15} />} onClick={() => setStatus('active')}>
                العودة للرحلات النشطة
              </Button>
            ) : (
              isManager && (
                <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={openCreate}>
                  أضف أول رحلة
                </Button>
              )
            )
          }
        />
      ) : (
        <div className={`mytrip__grid${viewingInactive ? ' mytrip__grid--inactive' : ''}`}>
          {trips.map((trip) => (
            <div className="mytrip__trip" key={trip.id}>
              <button
                type="button"
                className="mytrip__trip-card"
                onClick={() => navigate(`/myTrip/${trip.id}`)}
                aria-label={`فتح رحلة ${trip.name}`}
              >
                <span className="mytrip__trip-art" aria-hidden="true">
                  <Icon name="calendar" size={62} />
                </span>
                <span className="mytrip__trip-name">{trip.name}</span>
              </button>

              {isManager && (
                <IconButton
                  className="mytrip__trip-edit"
                  icon={<Icon name="edit" size={15} />}
                  label={`تعديل ${trip.name}`}
                  onClick={() => openEdit(trip)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="mytrip__footer">
          <Button
            variant="ghost"
            size="sm"
            className="mytrip__old-toggle"
            icon={<Icon name={viewingInactive ? 'refresh' : 'history'} size={15} />}
            onClick={() => setStatus(viewingInactive ? 'active' : 'inactive')}
          >
            {viewingInactive ? 'العودة للرحلات النشطة' : 'الرحلات القديمة (INACTIVE)'}
          </Button>
        </div>
      )}

      {formOpen && (
        <TripDialog
          key={editingTrip?.id ?? 'new'}
          trip={editingTrip}
          classes={classes}
          canChooseClass={canPickClass}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
