# SDK error code reference

Use this table when mapping SDK failures to dashboard toasts, backend retry policies, and support runbooks. Every SDK error should preserve a useful message while exposing a stable `code` string and structured `context` when available.

## Categories

| Category | Prefix / examples | Retryability | Suggested user message |
| --- | --- | --- | --- |
| Validation | `VALIDATION_ERROR`, field-specific validation codes | Retryable with corrected input | Review the highlighted field and try again. |
| Wallet | `WALLET_NOT_INSTALLED`, `WALLET_NOT_CONNECTED`, `WALLET_CONNECTION_REJECTED`, `WALLET_SIGNING_REJECTED`, `WALLET_NETWORK_MISMATCH`, `WALLET_INVALID_XDR`, `WALLET_UNKNOWN_ERROR` | Usually retryable after user action | Connect the wallet, switch networks, or approve the request. |
| RPC / network | `NETWORK_ERROR`, `RPC_TIMEOUT`, `TRANSACTION_TIMEOUT`, `INVALID_RESPONSE`, `UNKNOWN_RPC_ERROR` | Retryable after network recovery | The network or RPC endpoint is unavailable; retry shortly. |
| Proof | `PROOF_GENERATION_FAILED` | Retryable with corrected proof inputs or artifacts | Proof generation failed; refresh inputs/artifacts and retry. |
| Contract | `SIMULATION_FAILED`, `TRANSACTION_SUBMISSION_FAILED`, `INSUFFICIENT_FEE`, `CONTRACT_REVERT` | Depends on cause; many are corrected-input or caller-action failures | The contract rejected the transaction; review permissions, fees, and payload state. |
| Serialization | `SERIALIZATION_FAILED` | Retryable with corrected draft/import data | The payroll draft could not be imported or exported. |
| Reconciliation | `RECONCILIATION_MISMATCH`, `RECONCILIATION_STALE`, `RECONCILIATION_UNAVAILABLE` | Retryable after state refresh or operator review | Payroll records are out of sync; refresh status or escalate for review. |

## Representative mappings

| Code | Source class or flow | Meaning | Retryability | Recovery guidance |
| --- | --- | --- | --- | --- |
| `VALIDATION_ERROR` | `ValidationError` | SDK-side input validation failed. | Retryable with corrected input | Keep form state, highlight `field`, and resubmit after correction. |
| `WALLET_NOT_INSTALLED` | `WalletErrorCode.NOT_INSTALLED` | No supported wallet is available. | Retryable after user action | Prompt installation or offer a supported wallet path. |
| `WALLET_SIGNING_REJECTED` | `WalletRejectionError` | User rejected a signature request. | Retryable after user action | Explain what will be signed and let the user retry. |
| `WALLET_NETWORK_MISMATCH` | `WalletErrorCode.NETWORK_MISMATCH` | Wallet is connected to the wrong network. | Retryable after user action | Ask the user to switch network before retrying. |
| `NETWORK_ERROR` | `NetworkError` | Request failed outside contract execution. | Retryable after network recovery | Check connectivity and retry with backoff. |
| `RPC_TIMEOUT` | `RpcTimeoutError` | RPC request timed out. | Retryable after network recovery | Retry with backoff and keep pending status visible. |
| `TRANSACTION_TIMEOUT` | `ContractErrorCode.TRANSACTION_TIMEOUT` | Submitted transaction did not confirm in time. | Retryable after status check | Check transaction status before resubmitting. |
| `INVALID_RESPONSE` | `InvalidResponseError` | RPC returned malformed or unexpected data. | Retryable after endpoint recovery | Retry or switch RPC provider if repeated. |
| `PROOF_GENERATION_FAILED` | `ProofGenerationError` | Circuit artifact, witness, or proving step failed. | Retryable with corrected inputs/artifacts | Refresh proof artifacts and validate witness inputs. |
| `INSUFFICIENT_FEE` | `ContractExecutionError` | Soroban rejected the transaction fee. | Retryable with corrected fee | Increase fee buffer and simulate again. |
| `CONTRACT_REVERT` | `ContractExecutionError` | Contract rejected simulation or execution. | Depends on revert | Map known contract messages to exact field/permission recovery. |
| `SERIALIZATION_FAILED` | `SerializationError` | Draft import/export failed. | Retryable with corrected data | Ask for a valid draft payload and preserve original file for diagnostics. |
| `RECONCILIATION_MISMATCH` | Reconciliation consumers | Expected payroll state differs from observed state. | Retryable after operator review | Refresh source data and escalate if mismatch persists. |
| `RECONCILIATION_STALE` | Reconciliation consumers | Status data is older than the accepted freshness window. | Retryable after state refresh | Trigger or wait for reconciliation, then reload. |
| `RECONCILIATION_UNAVAILABLE` | Reconciliation consumers | Reconciliation service or source is unreachable. | Retryable after dependency recovery | Retry later and show degraded status. |

## Guidance for new errors

- Prefer a stable uppercase string code over parsing message text.
- Keep the existing human-readable message useful for logs and support.
- Include safe `context` keys such as `field`, `network`, `contractId`, `transactionId`, or `requestId`; never include salary values, proof witnesses, secret keys, seed phrases, or raw private inputs.
- Use `WalletErrorCode` and `ContractErrorCode` constants when adding wallet or contract failures.
- Add representative tests whenever a new public error class, enum member, or default user-facing message is introduced.