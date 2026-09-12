import type { Request, Response } from "express";
import { loginSchema } from "../schemas/auth.schema";
import * as authService from "../services/auth.service";
import { prisma } from "../config/prisma";

export async function login(
    req: Request, res: Response,
) {
    const result = loginSchema.safeParse(req.body);

    if(!result.success) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "INVALID LOGIN PAYLOAD",
            },
        });
    }

    try {
        const resultData = await authService.login(
            result.data.email, result.data.password,
        );

        res.cookie("refreshToken", resultData.refreshToken, {
            httpOnly: true, sameSite: "lax", path: "/auth",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7*24*60*60*1000,
        });

        return res.json({
            accessToken: resultData.accessToken, user: resultData.user,
        });
    } catch (error) {
        if (
            error instanceof Error && error.message === "INVALID_CREDENTIALS"
        ) {
            return res.status(401).json({
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid email or password",
                },
            });
        }

        throw error;
    }
}

export async function me(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return res.status(401).json({
      error: {
        code: "USER_NOT_FOUND",
        message: "User no longer exists",
      },
    });
  }

  return res.json({ user });
}

export async function refresh(
  req: Request, res: Response,
) {
  const refreshToken = req.cookies.refreshToken;

  if(!refreshToken) {
    return res.status(401).json({
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token required!",
      },
    });
  }

  try {
    const result = await authService.refresh(refreshToken);

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/auth", maxAge: 7*24*60*60*1000,
    });

    return res.json({
      accessToken: result.accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      error: {
        code: "INVALID_REFRESH_TOKEN", 
        message: "Invalid or expired refresh token",
      },
    });
  }
}

export async function logout(
  req: Request, res: Response,
) {
  console.log("Cookies:", req.cookies);
  const refreshToken = req.cookies.refreshToken;
  await authService.logout(refreshToken);

  res.clearCookie("refreshToken", {
    httpOnly: true, sameSite: "lax", path: "/auth",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(204).send();
}