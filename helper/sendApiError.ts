export function sendApiError(
  error: any,
  message = "Something went wrong",
  status = 400
) {
  return Response.json(
    {
      success: false,
      message,
      error: error instanceof Error ? error.message : error,
      data: null,
    },
    { status }
  );
}
