import { Router } from "express";

export const authUnavailableRouter = Router();

authUnavailableRouter.get("/auth/session", (_req, res) => {
  res.status(200).json({ authenticated: false, user: null });
});

authUnavailableRouter.use("/auth", (_req, res) => {
  res.status(503).json({
    error: {
      code: "AUTH_PROVIDER_NOT_CONFIGURED",
      message: "Authentication is disabled until the identity provider and security configuration are approved.",
      retryable: false,
    },
  });
});

authUnavailableRouter.use("/me", (_req, res) => {
  res.status(503).json({
    error: {
      code: "AUTH_PROVIDER_NOT_CONFIGURED",
      message: "Authentication is disabled until the identity provider and security configuration are approved.",
      retryable: false,
    },
  });
});
