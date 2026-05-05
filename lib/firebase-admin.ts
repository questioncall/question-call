import admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK for FCM (Firebase Cloud Messaging)
 */
export function initializeFirebase(): boolean {
  if (firebaseApp) {
    return true;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT_KEY is not configured. FCM push notifications will be disabled.",
    );
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    return false;
  }
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (!firebaseApp) {
    const initialized = initializeFirebase();
    if (!initialized) {
      return null;
    }
  }

  return admin.messaging(firebaseApp || undefined);
}

/**
 * Check if Firebase is configured and ready
 */
export function isFirebaseConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
}
