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