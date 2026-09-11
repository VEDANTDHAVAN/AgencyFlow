import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../types/auth";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

export function createAccessToken(user: AuthUser): string {
    return jwt.sign({
        sub: user.id, email: user.email, role: user.role,
    }, env.JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
}

export function createRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
    const date = new Date();

    date.setDate(
        date.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS,
    );

    return date;
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
}