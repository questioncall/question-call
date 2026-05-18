export function getGoogleAudiences(): string[] {
  return Array.from(
    new Set(
      [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_ID_PROD,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID_PROD,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID_PROD,
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
