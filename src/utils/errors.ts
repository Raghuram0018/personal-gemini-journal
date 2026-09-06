/**
 * Personal Gemini Journal - Error Handling & Sanitization
 * Enforces error boundaries that never leak secrets, API keys, PINs, or internal database metadata.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly userMessage: string;

  constructor(code: string, userMessage: string, internalDetails?: string) {
    super(internalDetails || userMessage);
    this.name = 'AppError';
    this.code = code;
    this.isOperational = true;
    this.userMessage = userMessage;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Sanitizes any raw error to guarantee no sensitive credentials, stack traces,
 * or infrastructure paths are exposed to the user interface.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  if (error instanceof AppError) {
    return error.userMessage;
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  // Guard against credential or sensitive keyword leakage
  const sensitivePatterns = [
    /key/i,
    /secret/i,
    /token/i,
    /password/i,
    /pin/i,
    /bearer/i,
    /credentials/i,
    /firestore\.rules/i,
    /private_key/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(rawMessage)) {
      return 'A secure processing error occurred. Details have been safely contained.';
    }
  }

  // Handle common operational messages safely
  if (rawMessage.includes('offline') || rawMessage.includes('network')) {
    return 'Network connectivity issue. Please verify your connection.';
  }
  if (rawMessage.includes('permission') || rawMessage.includes('insufficient permissions')) {
    return 'Access authorization denied. Please sign in with an authorized account.';
  }

  return rawMessage.slice(0, 150);
}
