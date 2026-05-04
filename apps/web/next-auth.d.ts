import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            emailVerified: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: string;
        emailVerified: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        emailVerified: boolean;
    }
}
