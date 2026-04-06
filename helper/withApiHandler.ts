import { ApiError } from "./apiError";
import { sendApiError } from "./sendApiError";

type ApiHandler<TArgs extends unknown[]> = (...args: TArgs) => Promise<Response>;

export function withApiHandler<TArgs extends unknown[]>(
  handler: ApiHandler<TArgs>,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        console.error("Error in withApiHandler:", error);
        return sendApiError(error, error.message, error.status);
      }

      console.error("Unexpected API error:", error);
      return sendApiError(error, "Unexpected error", 500);
    }
  };
}
