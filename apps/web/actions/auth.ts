"use server";

import { signIn, signOut } from "@/auth";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

export async function loginWithGoogle() {
    await signIn("google", { redirectTo: "/dashboard" });
}

export async function loginWithCredentials(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        const err = error as any;
        if (err?.type === "CredentialsSignin" || err?.name === "CredentialsSignin") {
            return { error: "Invalid credentials" };
        }

        // NextAuth throws a redirect error on success sometimes, which we shouldn't catch
        if (err?.message?.includes("NEXT_REDIRECT")) {
            throw error;
        }

        return { error: "Something went wrong" };
    }
}

export async function registerWithCredentials(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
        return { error: "All fields are required" };
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
        return { error: "Email already in use" };
    }

    // Need to assign a default organization for the user. We will create one if necessary or omit if not strictly required, but the schema says organizationId is optional now? Let me check schema.ts.
    // Wait, earlier I made organizationId optional in users.

    const passwordHash = await hash(password, 12);

    await db.insert(users).values({
        email,
        passwordHash,
        displayName: name,
        name,
        role: "member",
    });

    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        return { error: "Failed to login after registration. Please login manually." };
    }
}

export async function logout() {
    await signOut({ redirectTo: "/" });
}
