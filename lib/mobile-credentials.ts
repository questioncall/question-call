/**
 * Mobile App Credentials Configuration
 *
 * This file documents all credentials needed for the mobile app to function.
 * All values should be set in environment variables.
 *
 * DO NOT commit sensitive credentials to the repository!
 * Use environment variables or secure secrets management.
 */

export const getMobileAppCredentials = () => {
  return {
    // Pusher Real-time Communication
    pusher: {
      appKey: process.env.NEXT_PUBLIC_PUSHER_KEY,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      description: "Get from https://dashboard.pusher.com/apps",
    },

    // LiveKit Video/Audio
    livekit: {
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      description: "LiveKit server URL for video calls",
    },

    // Payment Gateways
    payment: {
      esewa: {
        merchantId: process.env.ESEWA_MERCHANT_ID,
        description: "eSewa merchant ID for Nepali payments",
      },
      khalti: {
        publicKey: process.env.NEXT_PUBLIC_KHALTI_PUBLIC_KEY,
        description: "Khalti public key for payment integration",
      },
    },

    // API Configuration
    api: {
      baseUrl:
        process.env.NEXT_PUBLIC_API_URL || "https://questioncall.com/api",
      description: "Base URL for API calls from mobile app",
    },

    // Authentication
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
      description: "Google OAuth 2.0 client IDs for web and Android",
    },
  };
};

/**
 * Validate that all required credentials are configured
 */
export function validateMobileCredentials(): {
  isValid: boolean;
  missing: string[];
} {
  const creds = getMobileAppCredentials();
  const missing: string[] = [];

  if (!creds.pusher.appKey) missing.push("NEXT_PUBLIC_PUSHER_KEY");
  if (!creds.pusher.cluster) missing.push("NEXT_PUBLIC_PUSHER_CLUSTER");
  if (!creds.livekit.serverUrl) missing.push("NEXT_PUBLIC_LIVEKIT_URL");
  if (!creds.payment.esewa.merchantId) missing.push("ESEWA_MERCHANT_ID");
  if (!creds.payment.khalti.publicKey)
    missing.push("NEXT_PUBLIC_KHALTI_PUBLIC_KEY");
  if (!creds.google.clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!creds.google.androidClientId)
    missing.push("GOOGLE_ANDROID_CLIENT_ID");

  return {
    isValid: missing.length === 0,
    missing,
  };
}
