# Archived Payroll Analytics Guide

This guide is for reporting, finance-operations, and analytics teams that consume historical payroll data from services built with the ZK Payroll SDK. It focuses on stable, already-executed records and deliberately avoids live salary discovery or raw proof inspection.

## Recommended Data Flow

1. Treat the application database or archive export as the source of historical reporting records.
2. Use SDK query helpers to describe the slice you need, then pass the resulting parameters to your API or archive adapter.
3. Page through results in deterministic windows and persist an ingestion checkpoint after each successful page.
4. Normalize records into analytics-safe facts before loading them into BI, warehouse, or reconciliation tools.

## SDK Surfaces To Reuse

| Need | SDK surface | Notes |
|---|---|---|
| Employee, period, asset, and status filters | `HistoryFilterBuilder` and `PayrollHistoryFilters` from `packages/core/src/filters/HistoryFilterBuilder.ts` | Build a typed `HistoryQuery` and use `query.toParams()` for API or archive requests. |
| Stable page windows | Pagination helpers documented in `docs/pagination.md` | Prefer cursor pagination for long-running exports because inserts during a run do not shift already-read pages. |
| Run-level rollups | `createExecutionSummary`, `successOutcome`, `failedOutcome`, and `pendingOutcome` from `packages/core/src/summary/PayrollExecutionSummary.ts` | Convert raw execution outcomes into totals that reporting systems can aggregate. |
| Registry metadata | `PayrollRegistryClient.getRegistry()` and `getEmployees()` | Read only the employee/employer metadata your reporting role is authorized to see. |
| Compliance access | `docs/audit-view-keys.md` | Use scoped, expiring audit access instead of sharing operational keys or full payroll stores. |

## Query Examples

### Monthly completed payroll by asset

```ts
import { HistoryFilterBuilder } from "@zk-payroll/core";

const query = new HistoryFilterBuilder()
  .forPeriod("2026-06-01", "2026-06-30")
  .withStatuses(["completed"])
  .withAssets(["native", "USDC"]);
  .paginate({ page: 1, limit: 100 })
  .build();

const params = query.toParams();
// Pass params to your archive endpoint or database adapter.
```

### Employee-level reporting slice

```ts
import { PayrollHistoryFilters } from "@zk-payroll/core";

const employeeHistory = PayrollHistoryFilters.byEmployee("employee_123");
const params = employeeHistory.toParams();
```

Keep employee identifiers pseudonymous in analytics stores unless the downstream team has an explicit business reason and approval to resolve them.

## Expected Archive Shape

Use a stable record shape at the boundary between product systems and analytics. A practical minimum is:

| Field | Purpose | Privacy note |
|---|---|---|
| `runId` | Groups payment outcomes for one payroll run | Use a generated run identifier, not a free-form note. |
| `periodStart` / `periodEnd` | Enables monthly or quarterly reporting | Store dates, not private payroll comments. |
| `employeeRef` | Joins records inside authorized reporting scopes | Prefer an internal pseudonymous reference. |
| `asset` | Groups payouts by asset | Safe to aggregate. |
| `amount` | Reporting amount in the smallest unit used by the SDK | Restrict row-level access; publish aggregates when possible. |
| `status` | `completed`, `pending`, or failure state | Do not expose raw internal error details to broad analytics audiences. |
| `txHash` | Reconciliation link to chain settlement when available | Safe for finance reconciliation, but avoid combining with employee identity broadly. |
| `createdAt` / `updatedAt` | Incremental ingestion and freshness checks | Use UTC timestamps. |

## Incremental Ingestion Checklist

- Use `updatedAt` or a cursor checkpoint so repeated jobs are idempotent.
- Store the exact filter window used for each export run.
- Keep raw archive reads separate from analytics tables that are widely queried.
- Recompute run summaries from immutable outcome rows instead of mutating old aggregate rows in place.
- Fail closed when audit access is expired or revoked; see `docs/audit-view-keys.md` for status helpers.

## Privacy Boundaries

- Do not export ZK proof witnesses, secret keys, salary notes, or raw employee PII to analytics tools.
- Prefer aggregate dashboards for teams that do not need row-level payroll access.
- Redact or pseudonymize employee references before sending data to third-party BI services.
- Keep audit keys scoped and time-limited; do not reuse operational signing keys for reporting access.
- Document who can re-identify pseudonymous employee references and review that access regularly.

## Reconciliation Pattern

Use `createExecutionSummary()` after each archived run to store totals for finance reconciliation:

```ts
import { createExecutionSummary } from "@zk-payroll/core";

const summary = createExecutionSummary(outcomes, durationMs);

warehouse.payroll_runs.upsert({
  runId,
  status: summary.status,
  totalCount: summary.totalCount,
  successCount: summary.successCount,
  failureCount: summary.failureCount,
  pendingCount: summary.pendingCount,
  durationMs: summary.durationMs,
  generatedAt: new Date(summary.timestamp).toISOString(),
});
```

For row-level reconciliation, keep `txHash`, asset, amount, status, and run identifiers. Keep employee identity resolution in a separate restricted table or service.

## Operational Handoff

Before handing a dataset to a reporting consumer, provide:

- The SDK version and archive schema version used for the export.
- The filter window and cursor/checkpoint range.
- Known omitted fields and the privacy reason they are omitted.
- Contact or runbook path for expired audit access, incomplete pages, and chain-settlement discrepancies.
