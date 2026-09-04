import React, { useMemo } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { formatDate, isToday } from '../../utils/dateUtils'
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import './CalendarView.css'

const YearView = ({ onDateSelect, onEventSelect }) => {
  const { currentDate, events, loading } = useCalendar()

  // Alle Monate des Jahres
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentDate.getFullYear(), i, 1)
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      const days = eachDayOfInterval({ start, end })
      return { month: i, days }
    })
  }, [currentDate])

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  // Events für jeden Tag speichern (für Performance)
  const eventsMap = useMemo(() => {
    const map = {}
    events.forEach(event => {
      if (!event || !event.start_time) return
      const dateKey = new Date(event.start_time).toDateString()
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(event)
    })
    return map
  }, [events])

  // Events für ein bestimmtes Datum abrufen
  const getEventsForDate = (date) => {
    return eventsMap[date.toDateString()] || []
  }

  if (loading && events.length === 0) {
    return (
      <div className="year-view-loading" style={{ 
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
    <div className="year-view">
      <h2 className="year-title">{currentDate.getFullYear()}</h2>
      
      <div className="year-grid">
        {months.map(({ month, days }) => {
          const monthName = formatDate(new Date(currentDate.getFullYear(), month, 1), 'MMMM')
          const monthEvents = days.reduce((count, day) => {
            return count + getEventsForDate(day).length
          }, 0)
          
          return (
            <div key={month} className="year-month">
              <div className="year-month-header" style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <h3 className="year-month-title">{monthName}</h3>
                {monthEvents > 0 && (
                  <span style={{ 
                    fontSize: '11px',
                    color: 'var(--primary-color)',
                    background: 'rgba(74,144,226,0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {monthEvents}
                  </span>
                )}
              </div>
              
              <div className="year-month-grid">
                {dayNames.map(day => (
                  <div key={day} className="year-month-day-name">
                    {day}
                  </div>
                ))}
                
                {days.map(day => {
                  const dayEvents = getEventsForDate(day)
                  const isTodayDay = isToday(day)
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`year-month-day ${isTodayDay ? 'today' : ''}`}
                      onClick={() => onDateSelect(day)}
                      title={`${formatDate(day, 'dd.MM.yyyy')} - ${dayEvents.length} Termin${dayEvents.length > 1 ? 'e' : ''}`}
                    >
                      <span className="year-month-day-number">
                        {formatDate(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="year-month-dot-indicator">
                          <span className="dot" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Legende */}
      <div className="year-legend" style={{ 
        marginTop: '24px',
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '12px',
        background: 'var(--surface-color)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--primary-color)'
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-color)' }}>
            Tage mit Terminen
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'transparent',
            border: '2px solid var(--primary-color)'
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-color)' }}>
            Heute
          </span>
        </div>
      </div>
    </div>
  )
}

export default YearView