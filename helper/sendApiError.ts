export function sendApiError(
  error: unknown,
  message = "Something went wrong",
  status = 400,
) {
  return Response.json(
    {
      success: false,
      message,
      error: error instanceof Error ? error.message : String(error),
      data: null,
    },
    { status },
  );
}
