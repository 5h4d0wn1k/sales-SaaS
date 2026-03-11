import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { compare } from "bcryptjs";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";

export default {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

                if (!user || !user.passwordHash) {
                    return null;
                }

                const isPasswordValid = await compare(password, user.passwordHash);

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.displayName,
                    role: user.role,
                };
            },
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // @ts-expect-error Types are augmented but TS server may be stale
                session.user.id = token.id || "";
                // @ts-expect-error
                session.user.role = token.role || "member";
            }
            return session;
        },
    },
    pages: {
        signIn: "/get-started",
    },
} satisfies NextAuthConfig;
