export type ApiError = {
  statusCode: number
  message: string | string[]
  field?: string
}

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "status" in error) {
    const err = error as { status: number; data?: unknown }
    const data = err.data

    if (data && typeof data === "object" && "message" in data) {
      const d = data as { message?: string | string[]; statusCode?: number; field?: string }
      return {
        statusCode: d.statusCode ?? err.status,
        message: d.message ?? "An unexpected error occurred",
        field: d.field,
      }
    }

    return {
      statusCode: err.status,
      message: "An unexpected error occurred",
    }
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  }
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseApiError(error)
  return Array.isArray(parsed.message) ? parsed.message[0] : parsed.message
}
