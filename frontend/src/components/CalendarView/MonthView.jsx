import React, { useMemo } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { getDaysInMonth, isToday, formatDate } from '../../utils/dateUtils'
import { isSameMonth } from 'date-fns'
import './CalendarView.css'

const MonthView = ({ onDateSelect, onEventSelect }) => {
  const { currentDate, events, loading } = useCalendar()

  // Tage nur einmal berechnen (useMemo verhindert Neuberechnung bei jedem Render)
  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate])

  // Events für einen Tag filtern (optimiert)
  const getEventsForDate = (date) => {
    const dateString = date.toDateString()
    return events.filter(event => {
      if (!event || !event.start_time) return false
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === dateString
    })
  }

  // Ladezustand anzeigen (aber ohne Blinken)
  if (loading && events.length === 0) {
    return (
      <div className="month-view-loading" style={{ 
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
    <div className="month-view">
      <div className="month-grid">
        {/* Wochenkopf */}
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
          <div key={day} className="month-header-cell">
            <span className="day-name">{day}</span>
          </div>
        ))}
        
        {/* Tage */}
        {days.map(day => {
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isTodayDay = isToday(day)
          
          return (
            <div
              key={day.toString()}
              className={`
                month-cell 
                ${!isCurrentMonth ? 'other-month' : ''} 
                ${isTodayDay ? 'today' : ''}
              `}
              onClick={() => onDateSelect(day)}
            >
              <div className="month-cell-date">
                {formatDate(day, 'd')}
              </div>
              <div className="month-cell-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="month-event"
                    style={{ backgroundColor: event.color || '#4a90e2' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventSelect(event)
                    }}
                    title={event.title}
                  >
                    <span className="event-title">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="month-event-more">
                    +{dayEvents.length - 3} mehr
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Leerer Zustand (nur wenn keine Events und nicht laden) */}
      {!loading && events.length === 0 && (
        <div className="no-events-message" style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: 'var(--secondary-color)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div>Keine Termine gefunden</div>
          <small style={{ display: 'block', marginTop: '4px' }}>
            Doppelklicke auf einen Tag, um einen Termin zu erstellen.
          </small>
        </div>
      )}
    </div>
  )
}

export default MonthView