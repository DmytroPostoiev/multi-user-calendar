import React, { useState } from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { formatDate } from '../../utils/dateUtils'
import Button from '../common/Button'

const ExportPDF = () => {
  const { events } = useCalendar()
  const [loading, setLoading] = useState(false)

  const exportToPDF = async () => {
    setLoading(true)
    try {
      // 1. Alle Events ab heute filtern
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const futureEvents = events.filter(event => {
        const eventDate = new Date(event.start_time)
        return eventDate >= today
      })

      if (futureEvents.length === 0) {
        alert('Keine zukünftigen Termine gefunden!')
        setLoading(false)
        return
      }

      // 2. HTML für PDF erstellen
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #4a90e2; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #4a90e2; color: white; padding: 10px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              .event-color { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
              .empty { text-align: center; color: #999; padding: 40px; }
            </style>
          </head>
          <body>
            <h1>📅 Meine Termine</h1>
            <p>Alle Termine ab ${formatDate(today, 'dd.MM.yyyy')}</p>
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Uhrzeit</th>
                  <th>Titel</th>
                  <th>Beschreibung</th>
                  <th>Farbe</th>
                </tr>
              </thead>
              <tbody>
                ${futureEvents.map(event => `
                  <tr>
                    <td>${formatDate(new Date(event.start_time), 'dd.MM.yyyy')}</td>
                    <td>${formatDate(new Date(event.start_time), 'HH:mm')} - ${formatDate(new Date(event.end_time), 'HH:mm')}</td>
                    <td>${event.title}</td>
                    <td>${event.description || '-'}</td>
                    <td><span class="event-color" style="background:${event.color || '#4a90e2'}"></span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
              Exportiert am ${new Date().toLocaleString()}
            </p>
          </body>
        </html>
      `

      // 3. PDF mit window.print() erstellen
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
        setLoading(false)
      }, 500)

    } catch (error) {
      console.error('PDF Export Fehler:', error)
      alert('Fehler beim Exportieren: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="secondary" 
      onClick={exportToPDF}
      loading={loading}
    >
      📄 PDF Export (alle Termine)
    </Button>
  )
}

export default ExportPDF