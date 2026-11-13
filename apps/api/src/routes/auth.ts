import { Router } from "express";
import type { AuthenticatedPrincipal } from "../auth/types.js";

export const authRouter = Router();

/**
 * Read-only session introspection. Registration, login, refresh, logout,
 * verification and password-reset routes are added with the selected auth
 * provider adapter; they are intentionally not simulated in this scaffold.
 */
authRouter.get("/auth/session", (req, res) => {
  const principal: AuthenticatedPrincipal | undefined = req.auth;

  if (!principal) {
    res.status(200).json({ authenticated: false, user: null });
    return;
  }

  res.status(200).json({
    authenticated: true,
    user: {
      id: principal.userId,
      email: principal.email,
      role: principal.role,
      status: principal.status,
    },
  });
});
