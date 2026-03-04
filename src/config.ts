import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration interface
 */
interface Config {
  /** Reclaim Protocol Application ID from https://dev.reclaimprotocol.org/ */
  reclaimAppId: string;
  /** Reclaim Protocol Application Secret */
  reclaimAppSecret: string;
  /** Amazon package tracking number to verify */
  trackingNumber: string;
}

/**
 * Loads and validates environment variables required for the application.
 *
 * @returns {Config} Configuration object with validated environment variables
 * @throws {Error} If any required environment variable is missing
 *
 * @example
 * const config = loadConfig();
 * console.log(config.reclaimAppId);
 */
export function loadConfig(): Config {
  const reclaimAppId = process.env.RECLAIM_APP_ID;
  const reclaimAppSecret = process.env.RECLAIM_APP_SECRET;
  const trackingNumber = process.env.TRACKING_NUMBER;

  if (!reclaimAppId) {
    throw new Error('RECLAIM_APP_ID is required in .env file. See .env.example for template.');
  }

  if (!reclaimAppSecret) {
    throw new Error('RECLAIM_APP_SECRET is required in .env file. See .env.example for template.');
  }

  if (!trackingNumber) {
    throw new Error('TRACKING_NUMBER is required in .env file. See .env.example for template.');
  }

  return {
    reclaimAppId,
    reclaimAppSecret,
    trackingNumber,
  };
}
