import { EventEmitter } from "events";
import { redactDeep, redactObject } from "../redaction/RedactionEngine";

export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  event: string;
  level: LogLevel;
  context?: Record<string, unknown>;
  timestamp: string;
}

export type LoggerHook = (entry: LogEvent) => void;

/** Structured logger interface for SDK observability. */
export interface SdkLogger extends EventEmitter {
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

/**
 * Creates an SdkLogger backed by a user‑supplied callback.
 * The hook receives every log entry as a structured LogEvent.
 */
export function createHookLogger(hook: LoggerHook): SdkLogger {
  const emitter = new EventEmitter() as SdkLogger;

  function emit(level: LogLevel, event: string, context?: Record<string, unknown>) {
    const logEntry: LogEvent = { event, level, context, timestamp: new Date().toISOString() };
    hook(logEntry);
    emitter.emit("log", logEntry);
    emitter.emit(event, logEntry);
  }

  emitter.info = (event, context) => emit("info", event, context);
  emitter.warn = (event, context) => emit("warn", event, context);
  emitter.error = (event, context) => emit("error", event, context);

  return emitter;
}

/**
 * Returns a shallow copy of `context` with sensitive field values replaced by "[redacted]".
 */
export function redactSensitive(context: Record<string, unknown>): Record<string, unknown> {
  return redactObject(context).redacted as Record<string, unknown>;
}
export type AuditLogOperation =
  | "validation"
  | "proof_setup"
  | "transaction_building"
  | "polling"
  | "reconciliation";

export type AuditLogStatus = "started" | "progress" | "succeeded" | "failed" | "retrying" | "skipped";

export interface AuditSafeLogOptions {
  /** Set false to return a no-op logger without invoking the hook. */
  enabled?: boolean;
  /** Extra field names that an integration considers sensitive. */
  additionalSensitiveFields?: string[];
}

export interface AuditSafeContext extends Record<string, unknown> {
  txHash?: string;
  ledger?: number | string;
  attempt?: number;
  durationMs?: number;
  code?: string;
  reason?: string;
  count?: number;
}

const AUDIT_SAFE_EXTRA_SENSITIVE_FIELDS = [
  "asset",
  "salary",
  "employer",
  "employee",
  "commitment",
  "commitmentHash",
  "nullifier",
  "proof",
  "proofInput",
  "proofInputs",
  "payload",
  "rawPayload",
  "rawResponse",
  "secretKey",
];

function createDisabledLogger(): SdkLogger {
  const emitter = new EventEmitter() as SdkLogger;
  emitter.info = () => undefined;
  emitter.warn = () => undefined;
  emitter.error = () => undefined;
  return emitter;
}

export function sanitizeAuditContext(
  context: Record<string, unknown>,
  additionalSensitiveFields: string[] = []
): Record<string, unknown> {
  return redactDeep(context, {
    additionalFields: [...AUDIT_SAFE_EXTRA_SENSITIVE_FIELDS, ...additionalSensitiveFields],
  }).redacted as Record<string, unknown>;
}

/**
 * Creates an opt-in logger for payroll audit/progress events.
 * Context is deeply redacted before the caller hook receives it.
 */
export function createAuditSafeLogger(
  hook: LoggerHook,
  options: AuditSafeLogOptions = {}
): SdkLogger {
  if (options.enabled === false) return createDisabledLogger();

  return createHookLogger((entry) => {
    hook({
      ...entry,
      context: entry.context
        ? sanitizeAuditContext(entry.context, options.additionalSensitiveFields)
        : undefined,
    });
  });
}

export function emitAuditEvent(
  logger: SdkLogger | undefined,
  operation: AuditLogOperation,
  status: AuditLogStatus,
  context: AuditSafeContext = {}
): void {
  if (!logger) return;

  const event = `audit.${operation}.${status}`;
  const safeContext = sanitizeAuditContext(context);

  if (status === "failed") {
    logger.error(event, safeContext);
  } else if (status === "retrying") {
    logger.warn(event, safeContext);
  } else {
    logger.info(event, safeContext);
  }
}
