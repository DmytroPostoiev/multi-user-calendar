// PhotoToEvent.jsx - Temporär deaktiviert für Vercel
import React from 'react'

const PhotoToEvent = ({ onEventCreated }) => {
  return (
    <div className="photo-to-event" style={{
      padding: '16px',
      background: 'var(--surface-color)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow)',
      marginBottom: '16px'
    }}>
      <div className="photo-to-event-header">
        <h3 style={{ margin: '0 0 4px 0' }}>📸 Termin aus Foto erstellen</h3>
        <p style={{ color: 'var(--secondary-color)', fontSize: '14px', margin: 0 }}>
          ⚠️ Foto-Funktion ist vorübergehend deaktiviert für Vercel Deployment.
        </p>
      </div>
    </div>
  )
}

export default PhotoToEvent