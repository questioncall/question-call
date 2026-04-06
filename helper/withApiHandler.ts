import { sendApiError } from "./sendApiError";
import { ApiError } from "./apiError";

export function withApiHandler(handler: Function) {
  return async (...args: any) => {
    try {
      return await handler(...args);
    } catch (err: any) {
      if (err instanceof ApiError) {
        console.log("Error at withApiHandler: in`", err);
         return sendApiError(err, err.message, err.status); 
      }
      console.log("Error at :", err);

      return sendApiError(err, "Unexpected error", 500);
    }
  };
}
