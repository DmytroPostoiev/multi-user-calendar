import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addYears,
  subYears
} from 'date-fns'

export const getDaysInMonth = (date) => {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export const getDaysInWeek = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export const navigateDate = (date, view, direction) => {
  const delta = direction === 'next' ? 1 : -1
  switch (view) {
    case 'day':
      return addDays(date, delta)
    case 'week':
      return addWeeks(date, delta)
    case 'month':
      return addMonths(date, delta)
    case 'year':
      return addYears(date, delta)
    default:
      return date
  }
}

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  return format(date, formatStr)
}

export const isToday = (date) => {
  return isSameDay(date, new Date())
}

export const getEventColor = (userId, userColors) => {
  return userColors[userId] || '#4a90e2'
}