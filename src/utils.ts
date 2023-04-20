import { Request, Response, NextFunction } from "express";

export const getAuthFromRequest = (req: Request) => {
  const authorizedTokens = (process.env.IDEFIX_ADMIN_TOKENS || "")
    ?.split(",")
    .map((token) => token.trim());

  const { headers = {} } = req;
  const { authorization } = headers;

  const [scheme, token] = authorization?.split(" ") || [];

  if (!scheme) {
    return {
      error: "401",
      message: "Authentication required",
    };
  }

  if (scheme.toLowerCase() !== "token") {
    return {
      error: "401",
      message: "Unsupported authentication scheme",
    };
  }

  if (!token) {
    return {
      error: "401",
      message: "Auth token required",
    };
  }

  if (token.length !== 36 || !authorizedTokens.includes(token)) {
    return {
      error: "401",
      message: "Invalid token",
    };
  }

  return { isAuth: true };
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, message } = getAuthFromRequest(req);
    if (error) {
      res.status(Number(error)).json({
        error: message,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("AUTH ERROR !", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export default authMiddleware;
