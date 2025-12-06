import NextAuth from "next-auth/next";
import SteamProvider from "next-auth-steam";
import type { NextRequest } from "next/server";

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  // 1. 动态获取当前网址（解决 Invalid URL 的核心）
  // 优先读 NEXTAUTH_URL，读不到就读 VERCEL_URL（Vercel 自动生成的环境域名）
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  // 调试日志：如果部署后还是不行，去 Vercel Logs 看这一行输出了什么
  console.log("Steam Auth Config:", { 
    baseUrl, 
    hasSecret: !!(process.env.STEAM_SECRET || process.env.STEAM_API_KEY) 
  });

  return NextAuth(req, ctx, {
    providers: [
      SteamProvider(req, {
        // 2. 兼容写法：无论你填的是 STEAM_SECRET 还是 STEAM_API_KEY，这里都能读到
        clientSecret: process.env.STEAM_SECRET || process.env.STEAM_API_KEY!,
        // 3. 显式指定回调地址：彻底根治 Invalid URL 报错
        callbackUrl: `${baseUrl}/api/auth/callback/steam`
      }),
    ],
    // 确保 NextAuth 能读到加密密钥
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async session({ session, token }) {
        if (session?.user) {
          // @ts-expect-error
          session.user.steamId = token.sub?.split("/").pop() || token.sub;
        }
        return session;
      },
      async jwt({ token, account, profile }) {
        if (account?.provider === "steam" && profile) {
          // @ts-expect-error
          token.steamId = profile.steamid;
        }
        return token;
      },
    },
  });
}

export { handler as GET, handler as POST };
