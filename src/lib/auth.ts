import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // MVP has no transactional email provider wired up yet — see README.
    requireEmailVerification: false,
    // Lowered from Better Auth's default (8) so the seeded demo accounts can
    // use a trivial local-dev password — never do this for a real deployment.
    minPasswordLength: 1,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once/day of active use
  },
  user: {
    additionalFields: {
      // input: false means this can never be set from a signup/update
      // payload — role changes only ever happen via a direct Prisma write
      // from an admin action (see app/actions/admin.ts).
      role: { type: "string", required: false, defaultValue: "host", input: false },
    },
  },
  // Must be the last plugin: lets Server Actions set cookies directly.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
