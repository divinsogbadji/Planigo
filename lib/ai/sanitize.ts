/**
 * Input sanitizer — strips sensitive data, trims, limits length.
 * © 2025 @skid | MIT License
 */

/** Patterns that should NEVER be sent to an AI provider */
const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,   // emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,                       // phone numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,            // credit cards
  /\b\d{3}-\d{2}-\d{4}\b/g,                                // SSN
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs
]

const MAX_LENGTH = 500

export function sanitizeGoal(raw: string): string {
  let text = raw.trim()

  // Strip sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]")
  }

  // Limit length
  if (text.length > MAX_LENGTH) {
    text = text.slice(0, MAX_LENGTH)
  }

  return text
}

export function sanitizeDeadline(raw?: string): string {
  if (!raw) return "not specified"
  const trimmed = raw.trim()
  // Only allow ISO date formats
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed
  }
  return "not specified"
}

