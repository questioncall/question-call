type CallToneOption = {
  value: string;
  label: string;
  description: string;
  /** Path relative to public/ — served at runtime as /sounds/<key>.wav */
  file: string;
};

export const CALL_RINGTONE_OPTIONS = [
  {
    value: "classic",
    label: "Warm Hum",
    description:
      "A gentle low-pitched hum built on a warm major third — feels like a soft doorbell.",
    file: "/sounds/classic.wav",
  },
  {
    value: "soft",
    label: "Soft Chime",
    description:
      "Two mellow notes fading in and out slowly, like a calm wind chime.",
    file: "/sounds/soft.wav",
  },
  {
    value: "nocturne",
    label: "Drift",
    description:
      "A slowly evolving pad with gentle vibrato — like breathing in and out.",
    file: "/sounds/nocturne.wav",
  },
  {
    value: "sonata",
    label: "Dewdrop",
    description:
      "A single soft drip that fades gently, spaced out with long silence between.",
    file: "/sounds/sonata.wav",
  },
  {
    value: "serenade",
    label: "Lullaby Bell",
    description:
      "Three soft music-box notes in a major triad — warm and delicate.",
    file: "/sounds/serenade.wav",
  },
  {
    value: "waltz",
    label: "Ocean Pulse",
    description:
      "A very low rhythmic pulse that rises and falls like gentle waves.",
    file: "/sounds/waltz.wav",
  },
  {
    value: "aria",
    label: "Zen Ping",
    description:
      "A single clean round ping with a long resonant tail — minimal and calm.",
    file: "/sounds/aria.wav",
  },
  {
    value: "prelude",
    label: "Amber Glow",
    description:
      "Two warm alternating tones a perfect fifth apart — like a calm heartbeat notification.",
    file: "/sounds/prelude.wav",
  },
  {
    value: "lullaby",
    label: "Cloud Float",
    description:
      "An airy, ethereal pad that drifts in and out — very soft and dreamy.",
    file: "/sounds/lullaby.wav",
  },
  {
    value: "reverie",
    label: "Twilight Gong",
    description:
      "A deep resonant gong hit with a long, fading decay — meditative and grounding.",
    file: "/sounds/reverie.wav",
  },
] as const satisfies readonly CallToneOption[];

export type CallRingtone = (typeof CALL_RINGTONE_OPTIONS)[number]["value"];

export type UserCallSettings = {
  silentIncomingCalls: boolean;
  incomingRingtone: CallRingtone;
  outgoingRingtone: CallRingtone;
};

type StoredUserCallSettings = Partial<UserCallSettings> & {
  ringtone?: string | null;
};

export const CALL_RINGTONE_VALUES = CALL_RINGTONE_OPTIONS.map(
  (option) => option.value,
) as [CallRingtone, ...CallRingtone[]];

export const DEFAULT_CALL_SETTINGS: UserCallSettings = {
  silentIncomingCalls: false,
  incomingRingtone: "aria",
  outgoingRingtone: "reverie",
};

export function isCallRingtone(value: string): value is CallRingtone {
  return CALL_RINGTONE_VALUES.includes(value as CallRingtone);
}

function normalizeCallRingtone(
  value: string | null | undefined,
  fallback: CallRingtone,
): CallRingtone {
  return value && isCallRingtone(value) ? value : fallback;
}

export function normalizeCallSettings(
  settings?: StoredUserCallSettings | null,
): UserCallSettings {
  const legacyRingtone = settings?.ringtone
    ? normalizeCallRingtone(
        settings.ringtone,
        DEFAULT_CALL_SETTINGS.incomingRingtone,
      )
    : null;

  const incomingFallback =
    legacyRingtone ?? DEFAULT_CALL_SETTINGS.incomingRingtone;
  const outgoingFallback =
    legacyRingtone ?? DEFAULT_CALL_SETTINGS.outgoingRingtone;

  return {
    silentIncomingCalls:
      typeof settings?.silentIncomingCalls === "boolean"
        ? settings.silentIncomingCalls
        : DEFAULT_CALL_SETTINGS.silentIncomingCalls,
    incomingRingtone: normalizeCallRingtone(
      settings?.incomingRingtone,
      incomingFallback,
    ),
    outgoingRingtone: normalizeCallRingtone(
      settings?.outgoingRingtone,
      outgoingFallback,
    ),
  };
}

export function getCallRingtoneOption(
  ringtone?: string | null,
): CallToneOption {
  return (
    CALL_RINGTONE_OPTIONS.find((option) => option.value === ringtone) ??
    CALL_RINGTONE_OPTIONS[0]
  );
}
