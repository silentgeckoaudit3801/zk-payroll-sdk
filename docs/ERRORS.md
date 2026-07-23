# SDK Error Handling

The ZK Payroll SDK normalizes all underlying network, contract, wallet, and proof generation failures into a unified, stable public error hierarchy. This allows integrators to build resilient user experiences and implement predictable recovery patterns.

## Error Hierarchy

All SDK errors inherit from the base `ZkPayrollError` class.

- `ZkPayrollError` (Base — includes `cause?: unknown` for underlying error preservation)
  - `WalletError` - Wallet interaction failures
    - `WalletRejectionError` - User explicitly declined a connection or signing request in their wallet
  - `ContractExecutionError` - On-chain simulation failures, reverts, insufficient fees, or rejected submissions.
    - `RpcTimeoutError` - RPC request or transaction submission didn't resolve in time (`RPC_TIMEOUT` or `TRANSACTION_TIMEOUT`)
    - `InvalidResponseError` - RPC returned malformed or unexpected payload structure (`INVALID_RESPONSE`)
  - `NetworkError` - Connection failures and unexpected HTTP responses.
  - `ProofGenerationError` - Failures related to circuit artifact downloading, caching, or witness calculation.
  - `SerializationError` - Failures during importing or exporting of payroll drafts.
  - `ValidationError` - Client-side validation errors.

*(Note: `PayrollError` is deprecated and acts as a backward-compatibility alias for `ZkPayrollError`)*

## Error code reference

See [docs/error-codes.md](error-codes.md) for the centralized category table, retryability guidance, and representative dashboard/backend mappings.

## Common Error Codes and Context

Every `ZkPayrollError` exposes:
1. `message`: A human-readable description of the failure.
2. `code`: A string or numeric code classifying the failure (e.g., `RPC_TIMEOUT`, `INVALID_RESPONSE`, `WALLET_SIGNING_REJECTED`).
3. `context`: A key-value record containing metadata relevant to the failure (e.g., `requestId`, transaction hash, or failing parameter).
4. `cause`: The underlying raw error, `AxiosError`, or wallet exception that caused the SDK error.

## User-Friendly UI Mapping

Use `toUserFriendlyError(error)` to map any SDK or unknown error into a clean, human-readable format suitable for UI toasts and diagnostic logs:

```typescript
import { toUserFriendlyError } from "@zk-payroll/sdk";

try {
  await service.processPayment(params);
} catch (error) {
  const { userMessage, technicalDetail, code } = toUserFriendlyError(error);
  showToastNotification(userMessage); // e.g. "Wallet request declined."
  logDiagnostic(code, technicalDetail);
}
```

## Handling Errors and Recovery Patterns

### 1. Handling Contract Reverts (`ContractExecutionError`)

Contract errors are mapped intelligently from the Soroban RPC responses. You should check the error code to determine if it was a user error, a network error, or a timeout.

```typescript
import { ContractExecutionError, ContractErrorCode } from "@zk-payroll/sdk";

try {
  await sdk.processPayment("G...", 100n);
} catch (error) {
  if (error instanceof ContractExecutionError) {
    switch (error.code) {
      case ContractErrorCode.INSUFFICIENT_FEE:
        // Recovery: Prompt the user to increase their fee buffer or retry.
        console.error("Transaction fee was too low.");
        break;
      case ContractErrorCode.TRANSACTION_TIMEOUT:
        // Recovery: Check the chain manually or queue the transaction to be verified later.
        console.error("The network is congested, transaction timed out.");
        break;
      case ContractErrorCode.CONTRACT_REVERT:
        // Recovery: The logic failed (e.g. insufficient funds). Surface the message to the user.
        console.error("Contract logic reverted:", error.message);
        break;
      default:
        console.error("Unknown contract error:", error.message);
    }
  } else {
    throw error;
  }
}
```

### 2. Handling Wallet Interactions (`WalletError`)

Wallet interactions are highly dependent on user input. Always catch `WalletError` to handle user rejections gracefully without crashing the app.

```typescript
import { WalletError, WalletErrorCode } from "@zk-payroll/sdk";

try {
  await walletAdapter.signAndSubmitTransaction(xdr);
} catch (error) {
  if (error instanceof WalletError) {
    if (error.code === WalletErrorCode.SIGNING_REJECTED) {
      // Recovery: Gently inform the user that the transaction was canceled.
      showToast("Transaction signing was canceled by the user.");
    } else if (error.code === WalletErrorCode.NETWORK_MISMATCH) {
      // Recovery: Ask the user to switch networks in their wallet extension.
      showWarning("Please switch your wallet to the Testnet network.");
    } else {
      console.error(`Wallet Error [${error.code}]:`, error.message);
    }
  }
}
```

### 3. Handling Zero-Knowledge Proof Failures (`ProofGenerationError`)

Proof generation is computationally heavy and relies on downloaded circuit artifacts.

```typescript
import { ProofGenerationError } from "@zk-payroll/sdk";

try {
  const proof = await generator.generateProof(witness);
} catch (error) {
  if (error instanceof ProofGenerationError) {
    // Recovery: Proof generation failed. This could be due to a malformed witness, 
    // or an inability to download the .wasm/.zkey artifacts.
    // Ensure `config.wasmUrl` and `config.zkeyUrl` are reachable.
    console.error("ZK Proof generation failed:", error.message);
  }
}
```

### 4. Handling Draft Serialization Issues (`SerializationError`)

When importing exported drafts, the data might be corrupted, tampered with, or from an incompatible version.

```typescript
import { importDraft, SerializationError } from "@zk-payroll/sdk";

try {
  const { draft, warnings } = importDraft(rawData, expectedChecksum);
  if (warnings.length > 0) {
    console.warn("Draft imported with warnings:", warnings);
  }
} catch (error) {
  if (error instanceof SerializationError) {
    if (error.code === "CHECKSUM_MISMATCH") {
      // Recovery: Do not trust the payload. Abort the import.
      alert("The draft file is corrupted or has been modified externally.");
    } else {
      // Recovery: Tell the user the file format is invalid.
      alert(`Cannot load draft: ${error.message}`);
    }
  }
}
```

### 5. Client-Side Validation (`ValidationError`)

Thrown internally when invalid arguments are provided to the SDK methods before hitting the network or the wallet.

```typescript
import { ValidationError } from "@zk-payroll/sdk";

try {
  await sdk.processPayment("invalid_address", -10n);
} catch (error) {
  if (error instanceof ValidationError) {
    // Recovery: Highlight the specific form field in the UI.
    form.setError(error.field, error.message);
  }
}
```
