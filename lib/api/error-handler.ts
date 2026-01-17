import { NextResponse } from 'next/server';

/**
 * Centralized error handling utilities for API routes
 */

export interface APIError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Handle OpenRouter API errors
 */
export function handleOpenRouterError(error: unknown): Error {
  if (error instanceof Error) {
    // Check if it's a timeout error
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      return error; // Already user-friendly
    }
    
    // Check if it's a network error
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
      return new Error('Connection error. Unable to reach the AI service. Please check your connection and try again.');
    }
    
    // Return API errors as-is
    return error;
  }
  
  return new Error('Unknown error occurred while calling OpenRouter API');
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: unknown): Error {
  if (error instanceof Error) {
    // Check for common database errors
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return new Error('Database connection error. Please try again.');
    }
    
    if (error.message.includes('unique constraint') || error.message.includes('duplicate')) {
      return new Error('A record with this information already exists.');
    }
    
    // Return database errors as-is, but sanitize sensitive info
    return error;
  }
  
  return new Error('Database operation failed');
}

/**
 * Handle validation errors
 */
export function handleValidationError(field: string, message?: string): NextResponse {
  const errorMessage = message || `Missing or invalid required parameter: ${field}`;
  return NextResponse.json(
    { error: errorMessage },
    { status: 400 }
  );
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, defaultMessage: string, statusCode: number = 500): NextResponse {
  const errorMessage = error instanceof Error 
    ? error.message 
    : defaultMessage;
  
  return NextResponse.json(
    { error: errorMessage },
    { status: statusCode }
  );
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  defaultErrorMessage: string = 'An error occurred'
): Promise<T> {
  return handler().catch((error) => {
    if (error instanceof Error && 'statusCode' in error) {
      // If error has statusCode, it's already a formatted error
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : defaultErrorMessage);
  });
}
