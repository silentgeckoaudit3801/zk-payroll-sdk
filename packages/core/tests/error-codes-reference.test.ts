import {
  ContractErrorCode,
  InvalidResponseError,
  RpcTimeoutError,
  ValidationError,
  WalletErrorCode,
  WalletRejectionError,
} from "../src/core/errors";
import { SerializationError } from "../src/errors";

describe("stable SDK error code mappings", () => {
  it("keeps representative wallet, validation, rpc, contract, and serialization codes stable", () => {
    expect(new ValidationError("bad", "employee").code).toBe("VALIDATION_ERROR");
    expect(new WalletRejectionError().code).toBe(WalletErrorCode.SIGNING_REJECTED);
    expect(new RpcTimeoutError().code).toBe(ContractErrorCode.RPC_TIMEOUT);
    expect(new InvalidResponseError().code).toBe(ContractErrorCode.INVALID_RESPONSE);
    expect(new SerializationError("bad draft").code).toBe("SERIALIZATION_FAILED");
  });

  it("exports wallet and contract code constants used by dashboard/backend consumers", () => {
    expect(WalletErrorCode.NETWORK_MISMATCH).toBe("WALLET_NETWORK_MISMATCH");
    expect(WalletErrorCode.INVALID_XDR).toBe("WALLET_INVALID_XDR");
    expect(ContractErrorCode.INSUFFICIENT_FEE).toBe("INSUFFICIENT_FEE");
    expect(ContractErrorCode.CONTRACT_REVERT).toBe("CONTRACT_REVERT");
    expect(ContractErrorCode.TRANSACTION_TIMEOUT).toBe("TRANSACTION_TIMEOUT");
  });
});
