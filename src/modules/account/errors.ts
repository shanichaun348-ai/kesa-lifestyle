export class AccountError extends Error {
  constructor(
    readonly code: "not_found" | "forbidden" | "invalid" | "duplicate" | "not_eligible",
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}
