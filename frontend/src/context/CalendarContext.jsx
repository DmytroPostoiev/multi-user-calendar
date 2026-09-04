import React, { createContext, useState, useContext, useEffect, useRef } from 'react'
import api from '../utils/api'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

const CalendarContext = createContext()

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Cache für fetchEvents (verhindert doppelte Anfragen)
  const lastFetchRef = useRef({ start: null, end: null })

  // === EVENTS LADEN ===
  const fetchEvents = async (start, end) => {
    const startStr = start.toISOString()
    const endStr = end.toISOString()
    
    // Cache: Wenn gleicher Zeitraum, nicht neu laden
    if (lastFetchRef.current.start === startStr && lastFetchRef.current.end === endStr) {
      return { success: true, data: events }
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/events', {
        params: { start: startStr, end: endStr }
      })
      
      setEvents(response.data)
      lastFetchRef.current = { start: startStr, end: endStr }
      return { success: true, data: response.data }
      
    } catch (err) {
      console.error('❌ Failed to fetch events:', err)
      setError(err.response?.data?.message || 'Fehler beim Laden der Termine')
      return { success: false, error: err.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // === EVENT HINZUFÜGEN ===
  const addEvent = async (eventData) => {
    try {
      setLoading(true)
      setError(null)
      
      const formattedData = {
        title: eventData.title,
        description: eventData.description || '',
        start: new Date(eventData.start).toISOString(),
        end: new Date(eventData.end).toISOString(),
        color: eventData.color || '#4a90e2',
        visibility: eventData.visibility || 'private',
        reminder: eventData.reminder || false,
        reminderMinutes: eventData.reminderMinutes || 15
      }

      console.log('📝 Event erstellen:', formattedData)

      const response = await api.post('/events', formattedData)
      setEvents(prev => [...prev, response.data])
      return { success: true, event: response.data }
      
    } catch (err) {
      console.error('❌ Failed to add event:', err)
      setError(err.response?.data?.message || 'Fehler beim Erstellen des Termins')
      return { success: false, error: err.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // === EVENT AKTUALISIEREN ===
  const updateEvent = async (id, eventData) => {
    try {
      setLoading(true)
      setError(null)
      
      const formattedData = {
        title: eventData.title,
        description: eventData.description || '',
        start: new Date(eventData.start).toISOString(),
        end: new Date(eventData.end).toISOString(),
        color: eventData.color || '#4a90e2',
        visibility: eventData.visibility || 'private',
        reminder: eventData.reminder || false,
        reminderMinutes: eventData.reminderMinutes || 15
      }

      console.log('✏️ Event aktualisieren:', id, formattedData)

      const response = await api.put(`/events/${id}`, formattedData)
      setEvents(prev => prev.map(e => e.id === id ? response.data : e))
      return { success: true, event: response.data }
      
    } catch (err) {
      console.error('❌ Failed to update event:', err)
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Termins')
      return { success: false, error: err.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // === EVENT LÖSCHEN ===
  const deleteEvent = async (id) => {
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/events/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      return { success: true }
      
    } catch (err) {
      console.error('❌ Failed to delete event:', err)
      setError(err.response?.data?.message || 'Fehler beim Löschen des Termins')
      return { success: false, error: err.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // === EVENTS FÜR EIN DATUM FILTERN ===
  const getEventsForDate = (date) => {
    if (!date) return []
    const dateString = date.toDateString()
    
    return events.filter(event => {
      if (!event || !event.start_time) return false
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === dateString
    })
  }

  // === EVENTS FÜR HEUTE ===
  const getTodayEvents = () => {
    return getEventsForDate(new Date())
  }

  // === EVENTS FÜR EINEN MONAT ===
  const getEventsForMonth = (date) => {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    
    return events.filter(event => {
      if (!event || !event.start_time) return false
      const eventDate = new Date(event.start_time)
      return eventDate >= start && eventDate <= end
    })
  }

  // === EVENTS FÜR EINE WOCHE ===
  const getEventsForWeek = (date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    
    return events.filter(event => {
      if (!event || !event.start_time) return false
      const eventDate = new Date(event.start_time)
      return eventDate >= start && eventDate <= end
    })
  }

  // === FEHLER ZURÜCKSETZEN ===
  const clearError = () => {
    setError(null)
  }

  // === EVENTS NEU LADEN (Cache zurücksetzen) ===
  const refreshEvents = () => {
    lastFetchRef.current = { start: null, end: null }
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return fetchEvents(start, end)
  }

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value = {
    // States
    events,
    currentDate,
    view,
    selectedEvent,
    loading,
    error,
    
    // Setters
    setCurrentDate,
    setView,
    setSelectedEvent,
    
    // Funktionen
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getTodayEvents,
    getEventsForMonth,
    getEventsForWeek,
    clearError,
    refreshEvents
  }

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  )
}