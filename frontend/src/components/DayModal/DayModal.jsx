import React, { useState, useEffect, useRef } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/dateUtils'
import Button from '../common/Button'
import './DayModal.css'

const DayModal = ({ date, event, onClose, userId }) => {
  const { addEvent, updateEvent, deleteEvent } = useCalendar()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // === NEU: Foto States ===
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    color: '#4a90e2',
    visibility: 'private',
    reminder: false,
    reminderMinutes: 15
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (event) {
      setIsEditing(true)
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start: formatDate(new Date(event.start_time || event.start), 'yyyy-MM-dd\'T\'HH:mm'),
        end: formatDate(new Date(event.end_time || event.end), 'yyyy-MM-dd\'T\'HH:mm'),
        color: event.color || '#4a90e2',
        visibility: event.visibility || 'private',
        reminder: event.reminder || false,
        reminderMinutes: event.reminderMinutes || 15
      })
      // Event-Foto laden (falls vorhanden)
      if (event.photo) {
        setPhotoPreview(event.photo)
      }
    } else if (date) {
      const dateStr = formatDate(date, 'yyyy-MM-dd')
      setFormData(prev => ({
        ...prev,
        start: `${dateStr}T09:00`,
        end: `${dateStr}T10:00`
      }))
    }
  }, [event, date])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // === NEU: Kamera-Funktionen ===
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      })
      setCameraStream(stream)
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error('Kamera Fehler:', err)
      alert('❌ Kamera konnte nicht gestartet werden. Bitte lade ein Foto hoch.')
      fileInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
      setCameraActive(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Foto als Base64 speichern
      const photoData = canvas.toDataURL('image/jpeg', 0.8)
      setPhotoPreview(photoData)
      setPhoto(photoData)
      
      // Kamera stoppen
      stopCamera()
      
      // Beschreibung um Foto-Info ergänzen
      if (!formData.description.includes('📸')) {
        setFormData(prev => ({
          ...prev,
          description: prev.description + '\n\n📸 Foto aufgenommen'
        }))
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photoData = reader.result
        setPhoto(photoData)
        setPhotoPreview(photoData)
        if (!formData.description.includes('📸')) {
          setFormData(prev => ({
            ...prev,
            description: prev.description + '\n\n📸 Foto: ' + file.name
          }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Foto-Info aus Beschreibung entfernen
    const desc = formData.description.replace(/\n*📸.*$/, '')
    setFormData(prev => ({
      ...prev,
      description: desc
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Beschreibung mit Foto-Info erweitern
    let description = formData.description
    if (photo) {
      description += `\n\n📸 Foto: ${photo}`
    }

    const eventData = {
      title: formData.title,
      description: description,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      color: formData.color || '#4a90e2',
      visibility: formData.visibility || 'private',
      reminder: formData.reminder || false,
      reminderMinutes: formData.reminderMinutes || 15,
      userId: user.id,
      photo: photo || null // Foto für Anzeige speichern
    }

    let result
    if (isEditing) {
      result = await updateEvent(event.id, eventData)
    } else {
      result = await addEvent(eventData)
    }

    setLoading(false)
    if (result.success) {
      stopCamera()
      onClose()
    } else {
      alert(result.error || 'Fehler beim Speichern')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Möchten Sie diesen Termin wirklich löschen?')) {
      setLoading(true)
      const result = await deleteEvent(event.id)
      setLoading(false)
      if (result.success) {
        onClose()
      } else {
        alert(result.error || 'Fehler beim Löschen')
      }
    }
  }

  const colors = ['#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db']

  return (
    <div className="modal-overlay" onClick={() => { stopCamera(); onClose() }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? '✏️ Termin bearbeiten' : '📅 Neuer Termin'}</h2>
          <button className="modal-close" onClick={() => { stopCamera(); onClose() }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Titel */}
          <div className="form-group">
            <label htmlFor="title">Titel *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Termin-Titel"
            />
          </div>
          
          {/* Beschreibung */}
          <div className="form-group">
            <label htmlFor="description">Beschreibung</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Beschreibung des Termins..."
            />
          </div>
          
          {/* Datum & Zeit */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">Start</label>
              <input
                id="start"
                name="start"
                type="datetime-local"
                value={formData.start}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end">Ende</label>
              <input
                id="end"
                name="end"
                type="datetime-local"
                value={formData.end}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          {/* Farbe */}
          <div className="form-group">
            <label>Farbe</label>
            <div className="color-picker">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>
          
          {/* Sichtbarkeit */}
          <div className="form-group">
            <label htmlFor="visibility">Sichtbarkeit</label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
            >
              <option value="private">🔒 Privat</option>
              <option value="shared">👥 Geteilt</option>
              <option value="public">🌍 Öffentlich</option>
            </select>
          </div>
          
          {/* Erinnerung */}
          <div className="form-row">
            <div className="form-group checkbox-group">
              <label htmlFor="reminder">
                <input
                  id="reminder"
                  name="reminder"
                  type="checkbox"
                  checked={formData.reminder}
                  onChange={handleChange}
                />
                🔔 Erinnerung setzen
              </label>
            </div>
            {formData.reminder && (
              <div className="form-group">
                <label htmlFor="reminderMinutes">Minuten vorher</label>
                <select
                  id="reminderMinutes"
                  name="reminderMinutes"
                  value={formData.reminderMinutes}
                  onChange={handleChange}
                >
                  <option value="5">5 Minuten</option>
                  <option value="15">15 Minuten</option>
                  <option value="30">30 Minuten</option>
                  <option value="60">1 Stunde</option>
                  <option value="1440">1 Tag</option>
                </select>
              </div>
            )}
          </div>

          {/* === NEU: Foto-Bereich === */}
          <div className="form-group">
            <label>📷 Foto hinzufügen</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📸 Kamera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--secondary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📁 Hochladen
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Entfernen
                </button>
              )}
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
              <div style={{ marginTop: '12px', position: 'relative' }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    maxHeight: '250px',
                    borderRadius: '8px',
                    background: '#000'
                  }}
                  muted
                />
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: '8px',
                  justifyContent: 'center'
                }}>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    style={{
                      padding: '8px 24px',
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
                    type="button"
                    onClick={stopCamera}
                    style={{
                      padding: '8px 24px',
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
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            )}
            
            {/* Foto-Vorschau */}
            {photoPreview && !cameraActive && (
              <div style={{ marginTop: '12px', position: 'relative' }}>
                <img 
                  src={photoPreview} 
                  alt="Foto Vorschau" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }} 
                />
              </div>
            )}
          </div>
          
          {/* Aktionen */}
          <div className="modal-actions">
            {isEditing && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={loading}
              >
                🗑️ Löschen
              </Button>
            )}
            <Button type="submit" variant="primary" loading={loading}>
              {isEditing ? '💾 Speichern' : '➕ Erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DayModal