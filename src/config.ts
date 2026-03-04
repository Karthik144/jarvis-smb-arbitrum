import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  reclaimAppId: string;
  reclaimAppSecret: string;
  trackingNumber: string;
}

export function loadConfig(): Config {
  const reclaimAppId = process.env.RECLAIM_APP_ID;
  const reclaimAppSecret = process.env.RECLAIM_APP_SECRET;
  const trackingNumber = process.env.TRACKING_NUMBER;

  if (!reclaimAppId) {
    throw new Error('RECLAIM_APP_ID is required in .env file');
  }

  if (!reclaimAppSecret) {
    throw new Error('RECLAIM_APP_SECRET is required in .env file');
  }

  if (!trackingNumber) {
    throw new Error('TRACKING_NUMBER is required in .env file');
  }

  return {
    reclaimAppId,
    reclaimAppSecret,
    trackingNumber,
  };
}
