import React, { useState, useEffect, useMemo } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { useAuth } from '../../context/AuthContext'
import DayView from './DayView'
import WeekView from './WeekView'
import MonthView from './MonthView'
import YearView from './YearView'
import TableView from './TableView'
import DayModal from '../DayModal/DayModal'
import ExportPDF from './ExportPDF'
import PhotoToEvent from './PhotoToEvent'
import Button from '../common/Button'
import { navigateDate, formatDate } from '../../utils/dateUtils'
import './CalendarView.css'

const CalendarView = () => {
  const { 
    currentDate, 
    view, 
    setCurrentDate, 
    setView, 
    selectedEvent,
    setSelectedEvent,
    fetchEvents,
    events,
    loading,
    error,
    clearError
  } = useCalendar()
  
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // ============================================
  // EVENTS LADEN (je nach Ansicht optimiert)
  // ============================================
  useEffect(() => {
    let start, end
    
    switch (view) {
      case 'day':
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        break
      case 'week':
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        start = weekStart
        end = weekEnd
        break
      case 'month':
      case 'year':
      default:
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        break
    }
    
    fetchEvents(start, end)
  }, [currentDate, view, fetchEvents])

  // ============================================
  // HEUTIGE TERMINE (mit useMemo für Performance)
  // ============================================
  const todayEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return events
      .filter(event => {
        if (!event || !event.start_time) return false
        const eventDate = new Date(event.start_time)
        return eventDate >= today
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }, [events])

  // ============================================
  // GEFILTERTE TERMINE (für Suche in Tabelle)
  // ============================================
  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events
    
    const term = searchTerm.toLowerCase().trim()
    return events.filter(event => {
      return (
        event.title?.toLowerCase().includes(term) ||
        event.description?.toLowerCase().includes(term) ||
        formatDate(new Date(event.start_time), 'dd.MM.yyyy').includes(term)
      )
    })
  }, [events, searchTerm])

  // ============================================
  // NAVIGATION
  // ============================================
  const handleNavigate = (direction) => {
    const newDate = navigateDate(currentDate, view, direction)
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setShowModal(true)
  }

  const handleEventSelect = (event) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedEvent(null)
    setSelectedDate(null)
  }

  // ============================================
  // ANSICHT RENDERN
  // ============================================
  const renderView = () => {
    switch (view) {
      case 'day': 
        return <DayView onDateSelect={handleDateSelect} onEventSelect={handleEventSelect} />
      case 'week': 
        return <WeekView onDateSelect={handleDateSelect} onEventSelect={handleEventSelect} />
      case 'month': 
        return <MonthView onDateSelect={handleDateSelect} onEventSelect={handleEventSelect} />
      case 'year': 
        return <YearView onDateSelect={handleDateSelect} onEventSelect={handleEventSelect} />
      case 'table': 
        return <TableView 
          onEventSelect={handleEventSelect} 
          filteredEvents={filteredEvents}
          searchTerm={searchTerm}
        />
      default: 
        return <MonthView onDateSelect={handleDateSelect} onEventSelect={handleEventSelect} />
    }
  }

  // ============================================
  // VIEW-NAMEN
  // ============================================
  const getViewName = () => {
    const names = {
      day: 'Tag',
      week: 'Woche',
      month: 'Monat',
      year: 'Jahr',
      table: 'Tabelle'
    }
    return names[view] || view
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="calendar-container">
      {/* ==========================================
          FEHLERMELDUNG
          ========================================== */}
      {error && (
        <div className="calendar-error" style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>❌ {error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ==========================================
          FOTO ZU TERMIN (KI-Funktion)
          ========================================== */}
      <PhotoToEvent onEventCreated={() => {
        // Nach Event-Erstellung neu laden
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        fetchEvents(start, end)
      }} />

      {/* ==========================================
          HEUTIGE TERMINE (Übersicht)
          ========================================== */}
      <div className="today-overview" style={{
        background: 'var(--surface-color)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>📅 Heutige Termine</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: 'var(--secondary-color)', fontSize: '14px' }}>
              {todayEvents.length} Termin{todayEvents.length !== 1 ? 'e' : ''}
            </span>
            <button
              onClick={() => setView('day')}
              style={{
                padding: '4px 12px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Alle anzeigen
            </button>
          </div>
        </div>
        
        {loading ? (
          <p style={{ color: 'var(--secondary-color)', margin: '8px 0 0 0' }}>
            ⏳ Lade Termine...
          </p>
        ) : todayEvents.length === 0 ? (
          <p style={{ color: 'var(--secondary-color)', margin: '8px 0 0 0' }}>
            📭 Keine Termine für heute
          </p>
        ) : (
          <div style={{ marginTop: '8px', maxHeight: '200px', overflow: 'auto' }}>
            {todayEvents.slice(0, 5).map(event => (
              <div 
                key={event.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
                onClick={() => handleEventSelect(event)}
              >
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: event.color || '#4a90e2'
                }} />
                <span style={{ fontWeight: '500', flex: 1 }}>{event.title}</span>
                <span style={{ color: 'var(--secondary-color)', fontSize: '13px' }}>
                  {formatDate(new Date(event.start_time), 'HH:mm')}
                </span>
                {event.description && (
                  <span style={{ 
                    color: 'var(--secondary-color)', 
                    fontSize: '12px',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    - {event.description}
                  </span>
                )}
              </div>
            ))}
            {todayEvents.length > 5 && (
              <p style={{ color: 'var(--secondary-color)', fontSize: '13px', margin: '4px 0 0 0' }}>
                + {todayEvents.length - 5} weitere Termin{todayEvents.length - 5 !== 1 ? 'e' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ==========================================
          KALENDER-HEADER
          ========================================== */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <Button onClick={() => handleNavigate('prev')} variant="icon">‹</Button>
          <h2>{formatDate(currentDate, view === 'year' ? 'yyyy' : 'MMMM yyyy')}</h2>
          <Button onClick={() => handleNavigate('next')} variant="icon">›</Button>
        </div>
        
        <div className="calendar-actions">
          <Button onClick={handleToday} variant="secondary">
            📍 Heute
          </Button>
          
          <div className="view-selector">
            {['day', 'week', 'month', 'year', 'table'].map(v => (
              <Button
                key={v}
                onClick={() => setView(v)}
                variant={view === v ? 'primary' : 'secondary'}
                size="small"
              >
                {v === 'day' ? '📅 Tag' : 
                 v === 'week' ? '📊 Woche' : 
                 v === 'month' ? '📆 Monat' : 
                 v === 'year' ? '📋 Jahr' : 
                 '📑 Tabelle'}
              </Button>
            ))}
          </div>
          
          <ExportPDF />
        </div>
      </div>

      {/* ==========================================
          SUCHE (nur in Tabellenansicht)
          ========================================== */}
      {view === 'table' && (
        <div className="search-bar" style={{
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="🔍 Termine durchsuchen (Titel, Beschreibung, Datum)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--background-color)',
              color: 'var(--text-color)',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
          {searchTerm && (
            <span style={{ color: 'var(--secondary-color)', fontSize: '13px' }}>
              {filteredEvents.length} Ergebnis{filteredEvents.length !== 1 ? 'se' : ''}
            </span>
          )}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '4px 12px',
                background: 'var(--secondary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕ Zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* ==========================================
          KALENDER-ANSICHT
          ========================================== */}
      <div className="calendar-body">
        {renderView()}
      </div>

      {/* ==========================================
          STATUS-LEISTE
          ========================================== */}
      <div className="calendar-footer" style={{
        marginTop: '16px',
        padding: '8px 16px',
        background: 'var(--surface-color)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: 'var(--secondary-color)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>
          📊 {events.length} Termin{events.length !== 1 ? 'e' : ''} 
          {view !== 'table' && ` in ${getViewName()}-Ansicht`}
          {searchTerm && view === 'table' && ` (gefiltert: ${filteredEvents.length})`}
        </span>
        <span>
          {loading ? '⏳ Lade...' : '✅ Aktualisiert'}
        </span>
        <span style={{ fontSize: '12px' }}>
          {new Date().toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* ==========================================
          MODAL
          ========================================== */}
      {showModal && (
        <DayModal
          date={selectedDate}
          event={selectedEvent}
          onClose={handleCloseModal}
          userId={user?.id}
        />
      )}
    </div>
  )
}

export default CalendarView