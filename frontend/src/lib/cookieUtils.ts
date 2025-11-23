/**
 * Secure cookie utilities for wallet session persistence
 * Uses secure, httpOnly-like approach through browser APIs
 */

const WALLET_COOKIE_NAME = "sui_wallet_session";
const WALLET_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Set a secure cookie with wallet information
 * Note: httpOnly is not available in client-side JS, but we use other security measures
 */
export function setWalletCookie(walletAddress: string): void {
  try {
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + WALLET_COOKIE_MAX_AGE);

    // Use SameSite=Lax for better compatibility with OAuth redirects in Chromium
    // Remove Secure flag for localhost development
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isProduction ? '; Secure' : '';
    
    document.cookie = `${WALLET_COOKIE_NAME}=${encodeURIComponent(walletAddress)}; path=/; max-age=${WALLET_COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`;
    
    // Also store in localStorage as backup for Chromium
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WALLET_COOKIE_NAME, walletAddress);
    }
  } catch (error) {
    console.error("Failed to set wallet cookie:", error);
  }
}

/**
 * Get wallet address from cookie
 */
export function getWalletCookie(): string | null {
  try {
    // Try cookie first
    const name = WALLET_COOKIE_NAME + "=";
    const cookies = document.cookie.split(";");

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return decodeURIComponent(cookie.substring(name.length));
      }
    }
    
    // Fallback to localStorage for Chromium compatibility
    if (typeof window !== 'undefined') {
      const storedValue = window.localStorage.getItem(WALLET_COOKIE_NAME);
      if (storedValue) {
        return storedValue;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get wallet cookie:", error);
    return null;
  }
}

/**
 * Delete wallet cookie (called on disconnect)
 */
export function deleteWalletCookie(): void {
  try {
    // Delete cookie
    document.cookie = `${WALLET_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    
    // Also remove from localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(WALLET_COOKIE_NAME);
    }
  } catch (error) {
    console.error("Failed to delete wallet cookie:", error);
  }
}

/**
 * Check if wallet cookie exists
 */
export function hasWalletCookie(): boolean {
  return getWalletCookie() !== null;
}
