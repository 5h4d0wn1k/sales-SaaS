// @ts-nocheck
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";

const googleAuthEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

export default {
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  secret: process.env.AUTH_SECRET,
  providers: [
    ...(googleAuthEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
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
          emailVerified: Boolean(user.emailVerified),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }: any) {
      const resolvedUserId = user?.id ?? token.id ?? token.sub;

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = Boolean(user.emailVerified);
      }

      if (resolvedUserId) {
        const [dbUser] = await db
          .select({
            id: users.id,
            role: users.role,
            emailVerified: users.emailVerified,
          })
          .from(users)
          .where(eq(users.id, resolvedUserId))
          .limit(1);

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.emailVerified = Boolean(dbUser.emailVerified);
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id || "";
        session.user.role = token.role || "member";
        session.user.emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
  pages: {
    signIn: "/get-started",
  },
} as any;
