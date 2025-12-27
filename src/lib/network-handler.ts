/**
 * Network Error Handler
 * Provides better error handling and retry logic for network requests
 */

export interface NetworkErrorDetails {
  message: string;
  isNetworkError: boolean;
  isCORSError: boolean;
  isTimeoutError: boolean;
  suggestions: string[];
}

export function analyzeNetworkError(error: any): NetworkErrorDetails {
  const errorMsg = error?.message || String(error);
  
  const isNetworkError = 
    errorMsg.includes('NetworkError') ||
    errorMsg.includes('Failed to fetch') ||
    errorMsg.includes('Network request failed');
    
  const isCORSError = 
    errorMsg.includes('CORS') ||
    errorMsg.includes('Cross-Origin') ||
    errorMsg.includes('No \'Access-Control-Allow-Origin\'');
    
  const isTimeoutError = 
    errorMsg.includes('timeout') ||
    errorMsg.includes('timed out');

  const suggestions: string[] = [];
  
  if (isNetworkError) {
    suggestions.push('Check your internet connection');
    suggestions.push('Disable browser extensions (ad blockers, privacy tools)');
    suggestions.push('Try incognito/private mode');
    suggestions.push('Check if firewall is blocking requests');
  }
  
  if (isCORSError) {
    suggestions.push('App might be running in restricted iframe');
    suggestions.push('Try opening in new tab/window');
    suggestions.push('Check browser console for CORS details');
  }
  
  if (isTimeoutError) {
    suggestions.push('Request took too long - try again');
    suggestions.push('Check if Supabase service is available');
  }

  return {
    message: errorMsg,
    isNetworkError,
    isCORSError,
    isTimeoutError,
    suggestions: suggestions.length > 0 ? suggestions : ['Unknown network error - check console for details'],
  };
}

/**
 * Wraps fetch with timeout and better error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    
    throw error;
  }
}

/**
 * Retry fetch with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  timeoutMs: number = 30000
): Promise<Response> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetch attempt ${attempt + 1}/${maxRetries}: ${url}`);
      const response = await fetchWithTimeout(url, options, timeoutMs);
      console.log(`✅ Fetch successful on attempt ${attempt + 1}`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`❌ Fetch attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message?.includes('404') || error.message?.includes('401')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  console.error(`❌ All ${maxRetries} fetch attempts failed`);
  throw lastError;
}

/**
 * Check if we can reach Supabase
 */
export async function testSupabaseConnection(projectId: string, apiKey: string): Promise<boolean> {
  try {
    const url = `https://${projectId}.supabase.co/rest/v1/`;
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: {
        'apikey': apiKey,
      },
    }, 10000);
    
    return response.ok;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

/**
 * Display user-friendly network error message
 */
export function displayNetworkError(error: any, context: string = 'operation') {
  const details = analyzeNetworkError(error);
  
  console.group(`🚨 Network Error during ${context}`);
  console.error('Error message:', details.message);
  console.error('Network error:', details.isNetworkError);
  console.error('CORS error:', details.isCORSError);
  console.error('Timeout error:', details.isTimeoutError);
  console.group('💡 Suggestions:');
  details.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
  console.groupEnd();
  console.groupEnd();
  
  return details;
}
