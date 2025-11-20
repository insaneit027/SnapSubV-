
/**
 * Converts seconds to "MM:SS.mmm" format
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00.000";
  
  const date = new Date(seconds * 1000);
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  const mmm = date.getUTCMilliseconds().toString().padStart(3, '0');
  
  return `${mm}:${ss}.${mmm}`;
};

/**
 * Converts "MM:SS.mmm" or "HH:MM:SS.mmm" to seconds
 * Robustly handles whitespace, commas, and various formats.
 */
export const parseTime = (timeString: string): number => {
  if (!timeString) return 0;
  
  // Normalize: trim whitespace and replace comma with dot
  const normalized = timeString.trim().replace(',', '.');
  
  // Handle seconds-only format (e.g. "1.5" or "12")
  if (!normalized.includes(':')) {
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : val;
  }
  
  const parts = normalized.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    seconds += parseInt(parts[0] || '0') * 3600;
    seconds += parseInt(parts[1] || '0') * 60;
    seconds += parseFloat(parts[2] || '0');
  } else if (parts.length === 2) {
    // MM:SS.mmm
    seconds += parseInt(parts[0] || '0') * 60;
    seconds += parseFloat(parts[1] || '0');
  }
  
  return isNaN(seconds) ? 0 : seconds;
};

/**
 * Adds offset in seconds to a time string
 */
export const offsetTime = (timeString: string, offsetSeconds: number): string => {
  const seconds = parseTime(timeString);
  const newSeconds = Math.max(0, seconds + offsetSeconds);
  return formatTime(newSeconds);
};

/**
 * Checks if a given time (in seconds) is within a subtitle's range
 */
export const isTimeInRange = (currentTime: number, start: string, end: string): boolean => {
  const s = parseTime(start);
  const e = parseTime(end);
  // Use small epsilon for floating point comparisons to avoid flicker at boundaries
  return currentTime >= (s - 0.05) && currentTime <= (e + 0.05);
};
