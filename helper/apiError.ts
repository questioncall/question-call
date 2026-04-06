export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status = 400, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}