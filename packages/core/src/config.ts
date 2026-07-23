import { ProofGeneratorConfig } from "./crypto/IProofGenerator";
import { validateProofConfig } from "./crypto/configValidation";
import { RetryOptions } from "./core/retry";
import { StrKey } from "@stellar/stellar-sdk";

export interface RetryPolicyConfig extends RetryOptions {}

export interface ClientConfig {
  networkUrl: string;
  contractId: string;
  adminKey?: string;
  proofConfig?: ProofGeneratorConfig;
  retry?: RetryPolicyConfig;
}

export interface ConfigValidationIssue {
  field: string;
  message: string;
  value?: unknown;
}

export class ConfigValidationError extends Error {
  constructor(public readonly issues: ConfigValidationIssue[]) {
    super(`Configuration validation failed:\n- ${issues.map((issue) => issue.message).join("\n- ")}`);
    this.name = "ConfigValidationError";
  }
}

export class ConfigBuilder {
  private _networkUrl?: string;
  private _contractId?: string;
  private _adminKey?: string;
  private _proofConfig?: ProofGeneratorConfig;
  private _retry?: RetryPolicyConfig;

  constructor(preset?: Partial<ClientConfig>) {
    if (preset) {
      this._networkUrl = preset.networkUrl;
      this._contractId = preset.contractId;
      this._adminKey = preset.adminKey;
      this._proofConfig = preset.proofConfig;
      this._retry = preset.retry;
    }
  }

  public withNetworkUrl(url: string): this {
    this._networkUrl = url;
    return this;
  }

  public withContractId(id: string): this {
    this._contractId = id;
    return this;
  }

  public withAdminKey(key: string): this {
    this._adminKey = key;
    return this;
  }

  public withProofConfig(config: ProofGeneratorConfig): this {
    this._proofConfig = config;
    return this;
  }

  public withRetryPolicy(retry: RetryPolicyConfig): this {
    this._retry = retry;
    return this;
  }

  public build(): ClientConfig {
    const issues: ConfigValidationIssue[] = [];
    const addIssue = (field: string, message: string, value?: unknown) => {
      issues.push({ field, message, ...(value !== undefined ? { value } : {}) });
    };

    if (!this._networkUrl) {
      addIssue("networkUrl", "networkUrl is required.");
    } else {
      try {
        const url = new URL(this._networkUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          addIssue(
            "networkUrl",
            `networkUrl must use http or https: ${this._networkUrl}`,
            this._networkUrl
          );
        }
      } catch {
        addIssue("networkUrl", `networkUrl is malformed: ${this._networkUrl}`, this._networkUrl);
      }
    }

    if (!this._contractId) {
      addIssue("contractId", "contractId is required.");
    } else if (!StrKey.isValidContract(this._contractId)) {
      addIssue("contractId", `contractId is malformed: ${this._contractId}`, this._contractId);
    }

    if (this._proofConfig) {
      try {
        validateProofConfig(this._proofConfig);
      } catch (error) {
        const field = error instanceof Error && "field" in error ? String(error.field) : "proofConfig";
        const message = error instanceof Error ? error.message : "proofConfig is invalid.";
        addIssue(field, message, this._proofConfig);
      }
    }

    if (this._retry) {
      const { attempts, delayMs, backoffFactor } = this._retry;
      if (attempts !== undefined && (!Number.isInteger(attempts) || attempts < 1)) {
        addIssue("retry.attempts", "retry.attempts must be an integer greater than or equal to 1.", attempts);
      }
      if (delayMs !== undefined && (!Number.isFinite(delayMs) || delayMs < 0)) {
        addIssue("retry.delayMs", "retry.delayMs must be a finite number greater than or equal to 0.", delayMs);
      }
      if (backoffFactor !== undefined && (!Number.isFinite(backoffFactor) || backoffFactor < 1)) {
        addIssue(
          "retry.backoffFactor",
          "retry.backoffFactor must be a finite number greater than or equal to 1.",
          backoffFactor
        );
      }
    }

    if (issues.length > 0) {
      throw new ConfigValidationError(issues);
    }

    return {
      networkUrl: this._networkUrl!,
      contractId: this._contractId!,
      adminKey: this._adminKey,
      proofConfig: this._proofConfig,
      retry: this._retry,
    };
  }
}

export const ConfigPresets = {
  local(): ConfigBuilder {
    return new ConfigBuilder({
      networkUrl: "http://localhost:8000",
    });
  },
  testnet(): ConfigBuilder {
    return new ConfigBuilder({
      networkUrl: "https://soroban-testnet.stellar.org",
    });
  },
  production(): ConfigBuilder {
    return new ConfigBuilder({
      networkUrl: "https://soroban-rpc.mainnet.stellar.org",
    });
  },
};

// Keep DEFAULT_CONFIG for backward compatibility, although users should migrate to presets
export const DEFAULT_CONFIG: ClientConfig = {
  networkUrl: "https://soroban-testnet.stellar.org",
  contractId: "",
};