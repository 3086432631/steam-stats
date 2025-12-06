import NextAuth from "next-auth/next";
import SteamProvider from "next-auth-steam";
import type { NextRequest } from "next/server";

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return NextAuth(req, ctx, {
    providers: [
      SteamProvider(req, {
        clientSecret: process.env.STEAM_SECRET!,
      }),
    ],
    pages: {
      error: "/auth/error",
    },
    callbacks: {
      async session({ session, token }) {
        if (session?.user) {
          // @ts-expect-error - steamId is not in the default types
          session.user.steamId = token.sub?.split("/").pop() || token.sub;
        }
        return session;
      },
      async jwt({ token, account, profile }) {
        if (account?.provider === "steam" && profile) {
          // @ts-expect-error - steamid is in profile
          token.steamId = profile.steamid;
        }
        return token;
      },
    },
  });
}

export { handler as GET, handler as POST };
