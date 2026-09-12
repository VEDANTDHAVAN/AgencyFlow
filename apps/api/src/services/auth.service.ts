import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { 
    createAccessToken, createRefreshToken,
    getRefreshTokenExpiry, hashRefreshToken,
} from "../utils/tokens";

export async function login(
    email: string, password: string,
) {
    const user = await prisma.user.findUnique({
        where: {email}
    });

    if(!user) {
        throw new Error("INVALID_CREDENTIALS");
    }
    const validPassword = await bcrypt.compare(
        password, user.passwordHash,
    );
    
    if (!validPassword) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const refreshToken = createRefreshToken();

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: hashRefreshToken(refreshToken),
            expiresAt: getRefreshTokenExpiry(),
        },
    });
    
    const accessToken = createAccessToken({
        id: user.id, email: user.email,
        role: user.role,
    });

    return { 
        accessToken, refreshToken,
        user: {
            id: user.id, name: user.name,
            email: user.email, role: user.role,
        },
    };
}

export async function refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
        where: {
            tokenHash,
        }, include: {
            user: true,
        },
    });

    if (!storedToken) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (storedToken.revokedAt) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (storedToken.expiresAt <= new Date()) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    const newRefreshToken = createRefreshToken();

    const result = await prisma.$transaction(async (tx) => {
        await tx.refreshToken.update({
            where: {
                id: storedToken.id,
            }, data: {
                revokedAt: new Date(),
            },
        });

        await tx.refreshToken.create({
            data: {
                userId: storedToken.userId,
                tokenHash: hashRefreshToken(newRefreshToken),
                expiresAt: getRefreshTokenExpiry(),
            },
        });

        const accessToken = createAccessToken({
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
        });

        return {
      accessToken,
      refreshToken: newRefreshToken,
        };
    });

    return result;
}

export async function logout(refreshToken: string | undefined) {
    if (!refreshToken) {
        return;
    }

    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.refreshToken.updateMany({
        where: {
            tokenHash, revokedAt: null,
        }, data: {
            revokedAt: new Date(),
        },
    });
}