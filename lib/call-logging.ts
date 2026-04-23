import { CALL_PAYLOAD_WARN_BYTES } from "@/lib/call-utils";

function serializeForLog(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "unserializable log payload" });
  }
}

export function getPayloadSizeBytes(payload: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    return -1;
  }
}

export function logCallLifecycle(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.info(
    "[call:lifecycle]",
    serializeForLog({
      scope: "call_lifecycle",
      event,
      loggedAt: new Date().toISOString(),
      ...details,
    }),
  );
}

export function auditCallPayload(
  event: string,
  payload: unknown,
  details: Record<string, unknown> = {},
) {
  const payloadBytes = getPayloadSizeBytes(payload);
  const logger =
    payloadBytes >= CALL_PAYLOAD_WARN_BYTES ? console.warn : console.info;

  logger(
    "[call:payload]",
    serializeForLog({
      scope: "call_payload",
      event,
      loggedAt: new Date().toISOString(),
      payloadBytes,
      withinBudget:
        payloadBytes < 0 ? null : payloadBytes < CALL_PAYLOAD_WARN_BYTES,
      ...details,
    }),
  );
}
