import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const accountUser = user as { role?: string; organizationId?: string | null };
        token.role = accountUser.role ?? "PLAYER";
        token.organizationId = accountUser.organizationId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = typeof token.role === "string" ? token.role : "PLAYER";
        session.user.organizationId = typeof token.organizationId === "string" ? token.organizationId : null;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      const admin = path.startsWith("/admin");
      const organizer = path.startsWith("/organizer");
      const player = ["/account", "/my-league", "/my-profile", "/host-a-game", "/directory"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      if (!admin && !organizer && !player) return true;
      if (!session?.user) return false;
      if (admin) return session.user.role === "ADMIN";
      if (organizer) return session.user.role === "ORGANIZER" || session.user.role === "ADMIN";
      return true;
    },
  },
});
