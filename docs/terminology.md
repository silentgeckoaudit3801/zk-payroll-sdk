# zkPayroll terminology guide

This guide keeps contributor-facing names aligned across the contracts, SDK, dashboard, and backend worker. Prefer the terms below in APIs, UI labels, docs, tests, and issue titles unless a repo already exposes a public name that must remain stable for compatibility.

## Preferred cross-repo terms

| Preferred term | Meaning | Avoid / legacy wording | Where it appears |
| --- | --- | --- | --- |
| Payroll run | One employer-initiated payroll cycle for a specific period and employee set. | payroll batch, payment batch, salary run | SDK execution helpers, dashboard history, backend workers |
| Payroll period | The time window covered by a payroll run. | cycle, epoch, pay window | contract inputs, dashboard filters, reconciliation reports |
| Salary commitment | A privacy-preserving commitment to salary data before proof generation. | salary hash, hidden salary, commitment hash when referring to the domain object | SalaryCommitment client, contracts, proof setup |
| Commitment hash | The concrete hash value stored or submitted for a salary commitment. | salary commitment when only the hash value is meant | contract events, payloads, test fixtures |
| Proof artifact | The generated ZK proof and public signals used to verify a payroll run or commitment. | proof blob, snark output | proof generation, worker handoff, backend verification |
| Treasury | The employer-controlled funding source for payroll settlement. | funding wallet, company wallet, payer account | dashboard funding UI, contracts, operations docs |
| Treasury funding checklist | Pre-run operator checks proving the treasury can settle a payroll run. | prefund checklist, balance checklist | dashboard run flow, backend readiness checks |
| Audit access | Time-limited, scoped reviewer access to payroll evidence or summaries. | auditor login, review key, compliance portal access | dashboard audit screens, SDK access helpers |
| View key | A key or token that grants scoped visibility into otherwise private payroll data. | audit key when the key is the credential itself | SDK audit helpers, backend access flows |
| Reconciliation | Comparing expected payroll state with on-chain, backend, and dashboard records. | settlement check, sync job, ledger diff | workers, SDK status APIs, dashboard status labels |
| Reconciliation finding | A concrete mismatch or stale state discovered during reconciliation. | issue, bug, warning when referring to the domain result | reports, dashboard alerts, logs |

## Repo-specific naming notes

- **Contracts** should use event and storage names that reflect domain objects: `PayrollRun`, `SalaryCommitment`, `Treasury`, and `AuditAccess`. When an event emits a raw hash, name the field `commitmentHash` instead of `salaryCommitment`.
- **SDK** APIs should expose domain types with the preferred terms above, while preserving backwards-compatible aliases only when they are already public.
- **Dashboard** labels should prefer user-facing nouns such as `Payroll run`, `Treasury`, and `Audit access`; avoid surfacing implementation names like `proof blob` or `sync job`.
- **Backend workers** may use job-oriented names internally, but docs and emitted status messages should map them back to `proof generation`, `settlement`, or `reconciliation`.

## Preferred wording examples

Use these examples when naming new APIs, docs sections, tests, or UI copy:

| Context | Preferred wording | Avoid |
| --- | --- | --- |
| SDK method | `createPayrollRun(...)` | `createBatch(...)` |
| SDK return type | `PayrollRunStatus` | `BatchStatus` |
| Dashboard heading | `Treasury funding checklist` | `Wallet prefund steps` |
| Error message | `Payroll period is outside the allowed range.` | `Cycle is invalid.` |
| Test name | `reconciliation flags a stale payroll run` | `sync job finds issue` |
| Event field | `commitmentHash` for the hash value | `salaryCommitment` for a raw hash |

## Naming checklist for contributors

Before adding a public type, function, route, event, document, or UI label:

1. Check this guide for an existing preferred term.
2. Use the same term across docs, tests, and examples in the same change.
3. If a contract or SDK public API already uses another name, keep compatibility and document any alias.
4. Prefer domain nouns over implementation details in user-facing strings.
5. Add a note to this guide when a new cross-repo concept appears in more than one repository.

## Related docs

- `README.md` for SDK overview and client examples.
- `docs/API.md` for exported SDK APIs.
- `docs/zk-architecture.md` for proof and privacy architecture.
- `docs/audit-view-keys.md` for audit access and view-key behavior.
- `docs/TROUBLESHOOTING.md` for operator-facing recovery language.