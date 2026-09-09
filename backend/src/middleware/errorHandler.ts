import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  if (response.headersSent) return;

  if (error?.name === "MongooseServerSelectionError" || error?.name === "MongoServerError") {
    response.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The kit store is temporarily unavailable.",
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
};