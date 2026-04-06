export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status = 400, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
