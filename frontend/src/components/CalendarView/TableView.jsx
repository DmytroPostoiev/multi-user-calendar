import React, { useState } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { formatDate } from '../../utils/dateUtils'

const TableView = ({ onEventSelect }) => {
  const { events, getTodayEvents } = useCalendar()
  const [filter, setFilter] = useState('all') // all, today, week, month
  const [sortBy, setSortBy] = useState('date') // date, title, color

  // Filter anwenden
  const getFilteredEvents = () => {
    const now = new Date()
    let filtered = [...events]

    switch (filter) {
      case 'today':
        const todayEvents = getTodayEvents()
        return todayEvents
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        filtered = events.filter(event => {
          const eventDate = new Date(event.start_time)
          return eventDate >= weekStart && eventDate <= weekEnd
        })
        break
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        filtered = events.filter(event => {
          const eventDate = new Date(event.start_time)
          return eventDate >= monthStart && eventDate <= monthEnd
        })
        break
      default:
        break
    }

    // Sortieren
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        break
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'color':
        filtered.sort((a, b) => (a.color || '#4a90e2').localeCompare(b.color || '#4a90e2'))
        break
      default:
        break
    }

    return filtered
  }

  const filteredEvents = getFilteredEvents()

  return (
    <div className="table-view">
      {/* Filter und Sortierung */}
      <div className="table-controls" style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ marginRight: '8px' }}>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px' }}>
            <option value="all">Alle Termine</option>
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '8px' }}>Sortieren nach:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px' }}>
            <option value="date">Datum</option>
            <option value="title">Titel</option>
            <option value="color">Farbe</option>
          </select>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--secondary-color)' }}>
          {filteredEvents.length} Termine
        </span>
      </div>

      {/* Tabelle */}
      <div style={{ 
        background: 'var(--surface-color)', 
        borderRadius: '12px', 
        boxShadow: 'var(--shadow)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--primary-color)', color: 'white' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Datum</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Uhrzeit</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Titel</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Beschreibung</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Farbe</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-color)' }}>
                  📭 Keine Termine gefunden
                </td>
              </tr>
            ) : (
              filteredEvents.map(event => (
                <tr key={event.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    {formatDate(new Date(event.start_time), 'dd.MM.yyyy')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {formatDate(new Date(event.start_time), 'HH:mm')} - {formatDate(new Date(event.end_time), 'HH:mm')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{event.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--secondary-color)' }}>
                    {event.description || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: event.color || '#4a90e2'
                    }}></span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => onEventSelect(event)}
                      style={{
                        padding: '4px 12px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableView