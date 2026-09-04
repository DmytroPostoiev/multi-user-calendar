import React, { useMemo } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { isToday, formatDate } from '../../utils/dateUtils'
import './CalendarView.css'

const DayView = ({ onDateSelect, onEventSelect }) => {
  const { currentDate, events, loading } = useCalendar()

  // Stunden für den Tag (0-23)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  // Events für den aktuellen Tag filtern (mit useMemo für Performance)
  const dayEvents = useMemo(() => {
    const dateString = currentDate.toDateString()
    return events.filter(event => {
      if (!event || !event.start_time) return false
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === dateString
    })
  }, [events, currentDate])

  // Events nach Stunden gruppieren
  const eventsByHour = useMemo(() => {
    const grouped = {}
    hours.forEach(h => { grouped[h] = [] })
    
    dayEvents.forEach(event => {
      const eventHour = new Date(event.start_time).getHours()
      if (grouped[eventHour]) {
        grouped[eventHour].push(event)
      }
    })
    return grouped
  }, [dayEvents, hours])

  if (loading && dayEvents.length === 0) {
    return (
      <div className="day-view-loading" style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        color: 'var(--secondary-color)'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
        <div>Termine werden geladen...</div>
      </div>
    )
  }

  return (
    <div className="day-view">
      {/* Kopfzeile mit Datum */}
      <div className="day-header">
        <h3 className={`day-title ${isToday(currentDate) ? 'today' : ''}`}>
          {formatDate(currentDate, 'EEEE, d. MMMM yyyy')}
        </h3>
        <button 
          className="add-event-btn"
          onClick={() => onDateSelect(currentDate)}
        >
          + Termin hinzufügen
        </button>
      </div>
      
      {/* Stunden-Grid */}
      <div className="day-grid">
        {hours.map(hour => {
          const hourEvents = eventsByHour[hour] || []
          
          return (
            <div key={hour} className="day-hour-row">
              <div className="day-hour-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="day-hour-slots">
                {hourEvents.length === 0 ? (
                  <div className="day-hour-empty" style={{ 
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                    color: 'var(--secondary-color)',
                    fontSize: '12px',
                    opacity: 0.5
                  }}>
                    {/* Keine Events */}
                  </div>
                ) : (
                  hourEvents.map(event => (
                    <div
                      key={event.id}
                      className="day-event"
                      style={{ backgroundColor: event.color || '#4a90e2' }}
                      onClick={() => onEventSelect(event)}
                    >
                      <div className="day-event-time">
                        {formatDate(new Date(event.start_time), 'HH:mm')} - {formatDate(new Date(event.end_time), 'HH:mm')}
                      </div>
                      <div className="day-event-title">{event.title}</div>
                      {event.description && (
                        <div className="day-event-description" style={{ 
                          fontSize: '12px', 
                          opacity: 0.8,
                          marginTop: '2px'
                        }}>
                          {event.description}
                        </div>
                      )}
                      {event.user_name && (
                        <div className="day-event-user">👤 {event.user_name}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Keine Events */}
      {!loading && dayEvents.length === 0 && (
        <div className="no-events-message" style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: 'var(--secondary-color)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div>Keine Termine für diesen Tag</div>
          <small style={{ display: 'block', marginTop: '4px' }}>
            Klicke auf "+ Termin hinzufügen", um einen Termin zu erstellen.
          </small>
        </div>
      )}
    </div>
  )
}

export default DayView