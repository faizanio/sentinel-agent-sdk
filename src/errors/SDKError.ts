export class SDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SDKError";
  }
}

export class ProviderError extends SDKError {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export class ToolExecutionError extends SDKError {
  constructor(message: string) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

export class MaxIterationsError extends SDKError {
  constructor(limit: number) {
    super(`Maximum iterations (${limit}) reached`);
    this.name = "MaxIterationsError";
  }
}

export class StructuredOutputError extends SDKError {
  constructor(message: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

export class GuardrailRejectionError extends SDKError {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailRejectionError";
  }
}

export class HandoffError extends SDKError {
  constructor(message: string) {
    super(message);
    this.name = "HandoffError";
  }
}