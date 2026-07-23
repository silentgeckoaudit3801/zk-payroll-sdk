import {
  createAuditSafeLogger,
  createHookLogger,
  emitAuditEvent,
  redactSensitive,
  sanitizeAuditContext,
  LogEvent,
} from "../src/logging/SdkLogger";

describe("createHookLogger", () => {
  it("calls the hook with an info entry", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.info("test_event", { key: "value" });

    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe("test_event");
    expect(entries[0].level).toBe("info");
    expect(entries[0].context).toEqual({ key: "value" });
    expect(typeof entries[0].timestamp).toBe("string");
  });

  it("calls the hook with a warn entry", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.warn("warn_event");

    expect(entries[0].level).toBe("warn");
    expect(entries[0].event).toBe("warn_event");
  });

  it("calls the hook with an error entry", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.error("error_event", { error: "oops" });

    expect(entries[0].level).toBe("error");
    expect(entries[0].context).toEqual({ error: "oops" });
  });

  it("works without context", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.info("no_ctx");

    expect(entries[0].context).toBeUndefined();
  });

  it("timestamp is a valid ISO string", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.info("ts_check");

    expect(() => new Date(entries[0].timestamp)).not.toThrow();
    expect(new Date(entries[0].timestamp).toISOString()).toBe(entries[0].timestamp);
  });

  it("fires hook for each call independently", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((e) => entries.push(e));

    logger.info("a");
    logger.warn("b");
    logger.error("c");

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.event)).toEqual(["a", "b", "c"]);
  });
});

describe("redactSensitive", () => {
  it("redacts recipient", () => {
    const result = redactSensitive({ recipient: "GABC123" });
    expect(result.recipient).toBe("[redacted]");
  });

  it("redacts amount", () => {
    const result = redactSensitive({ amount: 1000n });
    expect(result.amount).toBe("[redacted]");
  });

  it("redacts witness", () => {
    const result = redactSensitive({ witness: { a: 1 } });
    expect(result.witness).toBe("[redacted]");
  });

  it("redacts privateKey and adminKey", () => {
    const result = redactSensitive({ privateKey: "secret", adminKey: "key" });
    expect(result.privateKey).toBe("[redacted]");
    expect(result.adminKey).toBe("[redacted]");
  });

  it("preserves non-sensitive fields", () => {
    const result = redactSensitive({ txHash: "0xabc", method: "private_pay", count: 3 });
    expect(result.txHash).toBe("0xabc");
    expect(result.method).toBe("private_pay");
    expect(result.count).toBe(3);
  });

  it("handles mixed sensitive and non-sensitive fields", () => {
    const result = redactSensitive({ recipient: "G123", txHash: "0xabc", amount: 500n });
    expect(result.recipient).toBe("[redacted]");
    expect(result.amount).toBe("[redacted]");
    expect(result.txHash).toBe("0xabc");
  });

  it("returns empty object for empty input", () => {
    expect(redactSensitive({})).toEqual({});
  });
});
describe("audit-safe logging hooks", () => {
  it("deeply redacts payroll-sensitive fields before invoking the hook", () => {
    const entries: LogEvent[] = [];
    const logger = createAuditSafeLogger((entry) => entries.push(entry));

    logger.info("audit.validation.started", {
      txHash: "abc123",
      amount: 1000n,
      proofInputs: { recipient: "GABC", salary: "5000" },
      rawResponse: { secret: "do-not-log", ledger: 123 },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].context).toEqual({
      txHash: "abc123",
      amount: "[redacted]",
      proofInputs: "[redacted]",
      rawResponse: "[redacted]",
    });
  });

  it("supports a disabled logger that emits nothing", () => {
    const entries: LogEvent[] = [];
    const logger = createAuditSafeLogger((entry) => entries.push(entry), { enabled: false });

    logger.info("audit.validation.started", { txHash: "abc123" });
    logger.warn("audit.polling.retrying", { attempt: 2 });
    logger.error("audit.reconciliation.failed", { reason: "timeout" });

    expect(entries).toHaveLength(0);
  });

  it("emits normalized audit events with safe metadata", () => {
    const entries: LogEvent[] = [];
    const logger = createHookLogger((entry) => entries.push(entry));

    emitAuditEvent(logger, "transaction_building", "retrying", {
      txHash: "abc123",
      attempt: 2,
      salary: "private",
      payload: { secretKey: "hidden" },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe("audit.transaction_building.retrying");
    expect(entries[0].level).toBe("warn");
    expect(entries[0].context).toEqual({
      txHash: "abc123",
      attempt: 2,
      salary: "[redacted]",
      payload: "[redacted]",
    });
  });

  it("allows integrations to add custom sensitive fields", () => {
    expect(sanitizeAuditContext({ tenantId: "internal", count: 3 }, ["tenantId"])).toEqual({
      tenantId: "[redacted]",
      count: 3,
    });
  });
});
