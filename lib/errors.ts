export class UserFacingError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof UserFacingError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: "Không thể xử lý yêu cầu. Vui lòng thử lại." }, { status: 500 });
}
