/**
 * Centralized date/time utilities for consistent timezone handling.
 * 
 * IMPORTANT: JavaScript's new Date() with string parsing has inconsistent 
 * behavior across browsers and can interpret dates as UTC instead of local time.
 * 
 * These utilities ensure dates are always parsed in the local timezone.
 */

/**
 * Parse a date string (YYYY-MM-DD) and optional time string (HH:MM) 
 * into a Date object in the LOCAL timezone.
 * 
 * @param dateString - Date in "YYYY-MM-DD" format
 * @param timeString - Optional time in "HH:MM" or "HH:MM:SS" format
 * @returns Date object in local timezone
 */
export const parseEventDateTime = (
  dateString: string,
  timeString?: string | null
): Date => {
  // Validate date string format
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.warn('[date-utils] Invalid date string format:', dateString);
    return new Date(); // Fallback to now
  }

  const [year, month, day] = dateString.split('-').map(Number);
  
  if (timeString) {
    const timeParts = timeString.split(':').map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;
    
    return new Date(year, month - 1, day, hours, minutes, seconds, 0);
  }
  
  // No time specified - return midnight local time
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Parse a Date object (which might have been created incorrectly) 
 * and optional time string into a correctly localized Date.
 * 
 * Use this when the date comes as a Date object rather than string.
 * 
 * @param date - Date object
 * @param timeString - Optional time in "HH:MM" format
 * @returns Date object in local timezone
 */
export const parseDateObjectWithTime = (
  date: Date,
  timeString?: string | null
): Date => {
  const year = date.getFullYear();
  const month = date.getMonth(); // Already 0-indexed
  const day = date.getDate();
  
  if (timeString) {
    const timeParts = timeString.split(':').map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    
    return new Date(year, month, day, hours, minutes, 0, 0);
  }
  
  return new Date(year, month, day, 0, 0, 0, 0);
};

/**
 * Get the difference in minutes between a target date and now.
 * Positive = future, Negative = past
 * 
 * @param targetDate - The target Date object
 * @returns Number of minutes difference
 */
export const getMinutesUntil = (targetDate: Date): number => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60));
};

/**
 * Format a Date object to a time string in HH:MM format.
 * 
 * @param date - Date object
 * @returns Time string in "HH:MM" format
 */
export const formatTimeString = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Format a Date object to a date string in YYYY-MM-DD format.
 * 
 * @param date - Date object
 * @returns Date string in "YYYY-MM-DD" format
 */
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Check if a date/time combination is in the past.
 * 
 * @param dateString - Date in "YYYY-MM-DD" format
 * @param timeString - Optional time in "HH:MM" format
 * @returns true if the date/time is in the past
 */
export const isEventInPast = (
  dateString: string,
  timeString?: string | null
): boolean => {
  const eventDateTime = parseEventDateTime(dateString, timeString);
  return eventDateTime < new Date();
};

/**
 * Check if a date is today.
 * 
 * @param dateString - Date in "YYYY-MM-DD" format
 * @returns true if the date is today
 */
export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  
  return (
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate()
  );
};

/**
 * Get the user's timezone string (e.g., "America/Sao_Paulo").
 * This is useful for sending to backend functions.
 * 
 * @returns IANA timezone string
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get the user's timezone offset in minutes.
 * Positive for timezones behind UTC, negative for ahead.
 * 
 * @returns Offset in minutes
 */
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};
