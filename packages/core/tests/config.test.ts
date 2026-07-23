import { ConfigBuilder, ConfigPresets, ClientConfig, ConfigValidationError } from "../src/config";

describe("ConfigBuilder and ConfigPresets", () => {
  it("should build a valid config", () => {
    const config = new ConfigBuilder()
      .withNetworkUrl("https://soroban-testnet.stellar.org")
      .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
      .build();

    expect(config.networkUrl).toBe("https://soroban-testnet.stellar.org");
    expect(config.contractId).toBe("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC");
  });

  it("should fail validation if networkUrl is missing", () => {
    const builder = new ConfigBuilder().withContractId(
      "CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC"
    );

    expect(() => builder.build()).toThrow("networkUrl is required.");
  });

  it("should fail validation if networkUrl is malformed", () => {
    const builder = new ConfigBuilder()
      .withNetworkUrl("not-a-valid-url")
      .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC");

    expect(() => builder.build()).toThrow("networkUrl is malformed");
  });

  it("should fail validation if contractId is missing", () => {
    const builder = new ConfigBuilder().withNetworkUrl("http://localhost:8000");

    expect(() => builder.build()).toThrow("contractId is required.");
  });

  it("should fail validation if contractId is malformed", () => {
    const builder = new ConfigBuilder()
      .withNetworkUrl("http://localhost:8000")
      .withContractId("invalid_contract_id");

    expect(() => builder.build()).toThrow("contractId is malformed");
  });

  it("should fail validation if proofConfig is incomplete", () => {
    const builder = new ConfigBuilder()
      .withNetworkUrl("http://localhost:8000")
      .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
      .withProofConfig({ wasmUrl: "http://example.com/circuit.wasm" } as any);

    expect(() => builder.build()).toThrow("proofConfig.zkeyUrl is required.");
  });


  it("returns structured validation issues for multiple setup errors", () => {
    const builder = new ConfigBuilder()
      .withNetworkUrl("ftp://example.test")
      .withContractId("invalid_contract_id")
      .withRetryPolicy({ attempts: 0, delayMs: -1, backoffFactor: 0.5 });

    try {
      builder.build();
      throw new Error("Expected ConfigValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).issues.map((issue) => issue.field)).toEqual([
        "networkUrl",
        "contractId",
        "retry.attempts",
        "retry.delayMs",
        "retry.backoffFactor",
      ]);
      expect((error as ConfigValidationError).message).toContain(
        "Configuration validation failed:"
      );
    }
  });

  it("accepts valid proof artifact URLs and retry policy", () => {
    const config = new ConfigBuilder()
      .withNetworkUrl("https://soroban-testnet.stellar.org")
      .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
      .withProofConfig({
        wasmUrl: "https://cdn.example.test/payroll.wasm",
        zkeyUrl: "https://cdn.example.test/payroll.zkey",
      })
      .withRetryPolicy({ attempts: 4, delayMs: 250, backoffFactor: 2 })
      .build();

    expect(config.retry).toEqual({ attempts: 4, delayMs: 250, backoffFactor: 2 });
    expect(config.proofConfig?.wasmUrl).toBe("https://cdn.example.test/payroll.wasm");
  });
  describe("Presets", () => {
    it("should initialize local preset correctly", () => {
      const config = ConfigPresets.local()
        .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
        .build();

      expect(config.networkUrl).toBe("http://localhost:8000");
    });

    it("should initialize testnet preset correctly", () => {
      const config = ConfigPresets.testnet()
        .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
        .build();

      expect(config.networkUrl).toBe("https://soroban-testnet.stellar.org");
    });

    it("should initialize production preset correctly", () => {
      const config = ConfigPresets.production()
        .withContractId("CAKZGMMMJOHMSZ5V3DYKCUDNTIWBG57MAMFJDSVICNWUNVXLX6EZN3NC")
        .build();

      expect(config.networkUrl).toBe("https://soroban-rpc.mainnet.stellar.org");
    });
  });
});
