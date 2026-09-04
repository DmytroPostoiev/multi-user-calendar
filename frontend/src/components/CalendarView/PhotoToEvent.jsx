import React, { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'
import { useCalendar } from '../../context/CalendarContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/dateUtils'

const PhotoToEvent = ({ onEventCreated }) => {
  const { addEvent } = useCalendar()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [recognizedText, setRecognizedText] = useState('')
  const [extractedEvents, setExtractedEvents] = useState([]) // ← Array von Terminen
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // ============================================
  // KAMERA STARTEN
  // ============================================
  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error('Kamera Fehler:', err)
      setError('❌ Kamera konnte nicht gestartet werden. Bitte lade ein Foto hoch.')
      fileInputRef.current?.click()
    }
  }

  // ============================================
  // KAMERA STOPPEN
  // ============================================
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // ============================================
  // FOTO AUFNEHMEN
  // ============================================
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const photoData = canvas.toDataURL('image/jpeg', 0.9)
        setPhoto(photoData)
        setPreview(photoData)
        stopCamera()
        
        recognizeText(photoData)
      } catch (err) {
        console.error('Capture Fehler:', err)
        setError('❌ Foto konnte nicht aufgenommen werden.')
      }
    }
  }

  // ============================================
  // FOTO HOCHLADEN
  // ============================================
  const handleFileSelect = (e) => {
    setError(null)
    try {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const photoData = reader.result
          setPhoto(photoData)
          setPreview(photoData)
          recognizeText(photoData)
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      console.error('Upload Fehler:', err)
      setError('❌ Foto konnte nicht geladen werden.')
    }
  }

  // ============================================
  // OCR - MEHRERE TERMINE EXTRAHIEREN
  // ============================================
  const recognizeText = async (imageData) => {
    setLoading(true)
    setRecognizedText('📖 Erkenne Text...')
    setError(null)
    setExtractedEvents([])
    
    try {
      const result = await Tesseract.recognize(imageData, 'deu+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setRecognizedText(`📖 Erkenne Text: ${Math.round(m.progress * 100)}%`)
          }
        }
      })
      
      const text = result.data.text
      setRecognizedText(text)
      
      // === MEHRERE TERMINE EXTRAHIEREN ===
      const events = extractMultipleEvents(text)
      setExtractedEvents(events)
      
      if (events.length === 0) {
        setError('❌ Keine Termine im Text gefunden. Bitte versuche es erneut.')
      }
      
    } catch (err) {
      console.error('OCR Fehler:', err)
      setError('❌ Text konnte nicht erkannt werden. Bitte versuche es erneut.')
      setRecognizedText('')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // MEHRERE TERMINE AUS TEXT EXTRAHIEREN
  // ============================================
  const extractMultipleEvents = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    const events = []
    let currentEvent = null

    // Muster für Zeilen mit Datum und Uhrzeit
    const dateTimePattern = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*(?:am|um|,)?\s*(\d{1,2})[:.](\d{2})?\s*(?:Uhr|h)?/i
    const datePattern = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i
    const timePattern = /(\d{1,2})[:.](\d{2})?\s*(?:Uhr|h)?/i

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Prüfen ob die Zeile ein Datum + Uhrzeit enthält
      const dateTimeMatch = trimmed.match(dateTimePattern)
      if (dateTimeMatch) {
        // Wenn es bereits einen Termin gibt, speichern
        if (currentEvent) {
          events.push(currentEvent)
        }
        
        // Neuen Termin starten
        let day = parseInt(dateTimeMatch[1])
        let month = parseInt(dateTimeMatch[2])
        let year = parseInt(dateTimeMatch[3])
        let hour = parseInt(dateTimeMatch[4])
        let minute = dateTimeMatch[5] ? parseInt(dateTimeMatch[5]) : 0

        if (year < 100) year += 2000
        if (month > 12) {
          const temp = day
          day = month
          month = temp
        }

        const date = new Date(year, month - 1, day)
        date.setHours(hour, minute, 0, 0)

        currentEvent = {
          title: '',
          date: date,
          time: { hour, minute },
          description: '',
          location: '',
          raw: trimmed
        }
        continue
      }

      // Prüfen ob die Zeile nur ein Datum enthält
      const dateOnlyMatch = trimmed.match(datePattern)
      if (dateOnlyMatch && !trimmed.match(timePattern)) {
        if (currentEvent) {
          events.push(currentEvent)
        }
        
        let day = parseInt(dateOnlyMatch[1])
        let month = parseInt(dateOnlyMatch[2])
        let year = parseInt(dateOnlyMatch[3])
        if (year < 100) year += 2000
        if (month > 12) {
          const temp = day
          day = month
          month = temp
        }

        const date = new Date(year, month - 1, day)
        // Standard Uhrzeit 10:00
        date.setHours(10, 0, 0, 0)

        currentEvent = {
          title: '',
          date: date,
          time: { hour: 10, minute: 0 },
          description: '',
          location: '',
          raw: trimmed
        }
        continue
      }

      // Prüfen ob die Zeile eine Uhrzeit enthält
      const timeOnlyMatch = trimmed.match(timePattern)
      if (timeOnlyMatch && currentEvent) {
        let hour = parseInt(timeOnlyMatch[1])
        let minute = timeOnlyMatch[2] ? parseInt(timeOnlyMatch[2]) : 0
        currentEvent.time = { hour, minute }
        currentEvent.date.setHours(hour, minute, 0, 0)
        continue
      }

      // Wenn wir in einem Termin sind und der Text keine Zahl enthält
      if (currentEvent) {
        // Titel: Wenn noch kein Titel, nimm diese Zeile als Titel
        if (!currentEvent.title) {
          // Entferne Datum/Uhrzeit-Teile aus dem Titel
          const cleanTitle = trimmed
            .replace(dateTimePattern, '')
            .replace(datePattern, '')
            .replace(timePattern, '')
            .trim()
          if (cleanTitle) {
            currentEvent.title = cleanTitle
          } else {
            currentEvent.title = trimmed
          }
        } else {
          // Beschreibung: Anhängen
          const cleanText = trimmed
            .replace(dateTimePattern, '')
            .replace(datePattern, '')
            .replace(timePattern, '')
            .trim()
          if (cleanText) {
            currentEvent.description += (currentEvent.description ? '\n' : '') + cleanText
          }
        }
      }
    }

    // Letzten Termin speichern
    if (currentEvent) {
      events.push(currentEvent)
    }

    // Termine filtern und bereinigen
    return events
      .filter(e => e.date && e.date instanceof Date && !isNaN(e.date))
      .map(e => ({
        ...e,
        title: e.title || 'Termin aus Foto',
        description: e.description || '',
        location: e.location || ''
      }))
  }

  // ============================================
  // ALLE TERMINE AUF ONCE ERSTELLEN
  // ============================================
  const handleCreateAllEvents = async () => {
    if (extractedEvents.length === 0) return
    
    setCreating(true)
    setError(null)
    
    let successCount = 0
    let failCount = 0
    
    try {
      for (const event of extractedEvents) {
        try {
          const startDate = new Date(event.date)
          const endDate = new Date(startDate)
          endDate.setHours(startDate.getHours() + 1, startDate.getMinutes(), 0, 0)
          
          const eventData = {
            title: event.title || 'Termin aus Foto',
            description: [
              event.description,
              event.location ? `📍 Ort: ${event.location}` : '',
              `📸 Foto: ${photo}`
            ].filter(Boolean).join('\n\n'),
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            color: '#4a90e2',
            visibility: 'public',
            reminder: true,
            reminderMinutes: 15,
            userId: user?.id
          }
          
          const result = await addEvent(eventData)
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (err) {
          console.error('Event erstellen fehlgeschlagen:', err)
          failCount++
        }
      }
      
      // Ergebnis anzeigen
      if (successCount > 0) {
        alert(`✅ ${successCount} Termin${successCount > 1 ? 'e' : ''} erfolgreich erstellt!${failCount > 0 ? `\n❌ ${failCount} fehlgeschlagen.` : ''}`)
        
        // Zurücksetzen
        setPhoto(null)
        setPreview(null)
        setRecognizedText('')
        setExtractedEvents([])
        if (onEventCreated) onEventCreated()
      } else {
        setError('❌ Alle Termine konnten nicht erstellt werden.')
      }
      
    } catch (err) {
      console.error('Fehler beim Erstellen:', err)
      setError('❌ Fehler beim Erstellen der Termine.')
    } finally {
      setCreating(false)
    }
  }

  // ============================================
  // EINZELNEN TERMIN LÖSCHEN (aus der Liste)
  // ============================================
  const removeEvent = (index) => {
    setExtractedEvents(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="photo-to-event" style={{
      padding: '16px',
      background: 'var(--surface-color)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow)',
      marginBottom: '16px'
    }}>
      <div className="photo-to-event-header">
        <h3 style={{ margin: '0 0 4px 0' }}>📸 Termine aus Foto erstellen</h3>
        <p style={{ color: 'var(--secondary-color)', fontSize: '14px', margin: 0 }}>
          Foto aufnehmen oder hochladen – mehrere Termine werden automatisch erkannt
        </p>
      </div>

      {/* Fehler anzeigen */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
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

      {/* Buttons */}
      <div className="photo-actions" style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '16px'
      }}>
        <button
          onClick={startCamera}
          disabled={loading || creating}
          style={{
            padding: '10px 20px',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📷 Kamera
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || creating}
          style={{
            padding: '10px 20px',
            background: 'var(--secondary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📁 Foto hochladen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Kamera-Vorschau */}
      {cameraActive && (
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              background: '#000'
            }}
            muted
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={capturePhoto}
              style={{
                padding: '10px 24px',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              📸 Foto aufnehmen
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: '10px 24px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ❌ Schließen
            </button>
          </div>
        </div>
      )}

      {/* Foto-Vorschau */}
      {preview && !cameraActive && (
        <div style={{ marginBottom: '16px' }}>
          <img
            src={preview}
            alt="Vorschau"
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => {
                setPhoto(null)
                setPreview(null)
                setRecognizedText('')
                setExtractedEvents([])
                setError(null)
              }}
              style={{
                padding: '4px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Entfernen
            </button>
          </div>
        </div>
      )}

      {/* Ladezustand */}
      {loading && !recognizedText && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-color)' }}>
          <div>⏳ Text wird erkannt...</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Bitte warten</div>
        </div>
      )}

      {/* OCR-Ergebnis */}
      {recognizedText && !loading && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          background: 'var(--background-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>📝 Erkannt:</h4>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            margin: 0,
            fontSize: '14px',
            maxHeight: '150px',
            overflow: 'auto'
          }}>
            {recognizedText}
          </pre>
        </div>
      )}

      {/* MEHRERE EXTRAHIERTE TERMINE */}
      {extractedEvents.length > 0 && !loading && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          background: 'var(--surface-color)',
          borderRadius: '8px',
          border: '2px solid var(--primary-color)',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>
              📅 {extractedEvents.length} Termin{extractedEvents.length > 1 ? 'e' : ''} gefunden
            </h4>
            <span style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>
              🔒 Alle werden <strong>öffentlich</strong> erstellt
            </span>
          </div>
          
          {/* Liste der Termine */}
          {extractedEvents.map((event, index) => (
            <div key={index} style={{
              padding: '12px',
              marginBottom: '8px',
              background: 'var(--background-color)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{event.title || 'Termin'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>
                    📅 {formatDate(event.date, 'dd.MM.yyyy')} • 🕐 {event.time.hour}:{String(event.time.minute).padStart(2, '0')} Uhr
                  </div>
                  {event.description && (
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      {event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeEvent(index)}
                  style={{
                    padding: '2px 8px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: '8px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          
          <button
            onClick={handleCreateAllEvents}
            disabled={creating}
            style={{
              marginTop: '12px',
              padding: '10px 24px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            {creating ? '⏳ Erstelle Termine...' : `✅ Alle ${extractedEvents.length} Termin${extractedEvents.length > 1 ? 'e' : ''} erstellen`}
          </button>
        </div>
      )}
    </div>
  )
}

export default PhotoToEvent