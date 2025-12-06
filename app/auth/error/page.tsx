"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthCallbackError":
        return {
          title: "Steam 登录失败",
          message: "无法完成 Steam 认证。这通常是临时问题，请稍后重试。",
          suggestions: [
            "等待几秒后重新尝试登录",
            "检查你的 Steam 个人资料是否设为公开",
            "确认 Steam 服务是否正常运行",
          ],
        };
      case "AccessDenied":
        return {
          title: "访问被拒绝",
          message: "你取消了登录或没有授权访问。",
          suggestions: ["重新尝试登录并完成授权"],
        };
      default:
        return {
          title: "登录错误",
          message: "登录过程中发生了错误。",
          suggestions: ["请稍后重试"],
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>{errorInfo.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center">
          {errorInfo.message}
        </p>

        {errorInfo.suggestions.length > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium mb-2">建议：</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {errorInfo.suggestions.map((suggestion, i) => (
                <li key={i}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button asChild className="flex-1">
            <Link href="/api/auth/signin">
              <RefreshCw className="h-4 w-4 mr-2" />
              重试登录
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}

