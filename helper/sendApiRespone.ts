export function sendApiResponse(data: any, message = "Success", status = 200) {
  return Response.json(
    {
      success: true,
      message,
      error: null,
      data,
    },
    { status }
  );
}
