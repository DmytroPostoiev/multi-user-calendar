import React, { useMemo } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { getDaysInWeek, isToday, formatDate } from '../../utils/dateUtils'
import './CalendarView.css'

const WeekView = ({ onDateSelect, onEventSelect }) => {
  const { currentDate, events, loading } = useCalendar()

  // Tage der Woche
  const days = useMemo(() => getDaysInWeek(currentDate), [currentDate])
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  // Events für jeden Tag der Woche gruppieren
  const eventsByDay = useMemo(() => {
    const grouped = {}
    days.forEach(day => {
      const dateString = day.toDateString()
      grouped[dateString] = events.filter(event => {
        if (!event || !event.start_time) return false
        const eventDate = new Date(event.start_time)
        return eventDate.toDateString() === dateString
      })
    })
    return grouped
  }, [events, days])

  // Events für jeden Tag und Stunde gruppieren
  const eventsByDayHour = useMemo(() => {
    const grouped = {}
    days.forEach(day => {
      const dateString = day.toDateString()
      grouped[dateString] = {}
      hours.forEach(h => {
        grouped[dateString][h] = []
      })
      
      events.forEach(event => {
        if (!event || !event.start_time) return false
        const eventDate = new Date(event.start_time)
        if (eventDate.toDateString() === dateString) {
          const hour = eventDate.getHours()
          if (grouped[dateString][hour]) {
            grouped[dateString][hour].push(event)
          }
        }
      })
    })
    return grouped
  }, [events, days, hours])

  if (loading && events.length === 0) {
    return (
      <div className="week-view-loading" style={{ 
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
    <div className="week-view">
      {/* Kopfzeile mit Wochentagen */}
      <div className="week-header">
        <div className="week-time-label" style={{ 
          padding: '12px',
          textAlign: 'center',
          fontWeight: '600',
          color: 'var(--secondary-color)',
          borderRight: '1px solid var(--border-color)'
        }}>
          Uhrzeit
        </div>
        {days.map(day => {
          const dateString = day.toDateString()
          const dayEventCount = eventsByDay[dateString]?.length || 0
          
          return (
            <div 
              key={day.toString()} 
              className={`week-header-cell ${isToday(day) ? 'today' : ''}`}
              onClick={() => onDateSelect(day)}
            >
              <div className="week-day-name">
                {formatDate(day, 'EEE')}
              </div>
              <div className="week-day-number">
                {formatDate(day, 'd')}
              </div>
              {dayEventCount > 0 && (
                <div className="week-day-count" style={{ 
                  fontSize: '10px',
                  color: 'var(--primary-color)',
                  marginTop: '2px'
                }}>
                  {dayEventCount} Termin{dayEventCount > 1 ? 'e' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Stunden-Grid */}
      <div className="week-grid">
        <div className="week-time-column">
          {hours.map(hour => (
            <div key={hour} className="week-time-label">
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        {days.map(day => {
          const dateString = day.toDateString()
          const dayHourEvents = eventsByDayHour[dateString] || {}
          
          return (
            <div key={day.toString()} className="week-day-column">
              {hours.map(hour => {
                const hourEvents = dayHourEvents[hour] || []
                
                return (
                  <div key={hour} className="week-hour-slot">
                    {hourEvents.length === 0 ? (
                      <div className="week-hour-empty" style={{ height: '100%' }} />
                    ) : (
                      hourEvents.map(event => (
                        <div
                          key={event.id}
                          className="week-event"
                          style={{ backgroundColor: event.color || '#4a90e2' }}
                          onClick={() => onEventSelect(event)}
                        >
                          <div className="week-event-time">
                            {formatDate(new Date(event.start_time), 'HH:mm')}
                          </div>
                          <div className="week-event-title">{event.title}</div>
                        </div>
                      ))
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeekView