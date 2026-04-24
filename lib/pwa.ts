export const ENABLE_PWA_IN_DEV =
  process.env.NEXT_PUBLIC_ENABLE_PWA_IN_DEV === "true";

export const SHOULD_ENABLE_PWA =
  process.env.NODE_ENV === "production" || ENABLE_PWA_IN_DEV;
