"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Gamepad2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LoginButton() {
  const { data: session } = useSession();
  const { t } = useI18n();

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 ring-2 ring-primary/20">
          <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {session.user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col">
          <span className="text-sm font-medium">{session.user?.name}</span>
          <button 
            onClick={() => signOut()} 
            className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" />
            {t.login.signOut}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={() => signIn("steam")}
      variant="steam"
      size="lg"
      className="gap-3"
    >
      <Gamepad2 className="h-5 w-5" />
      {t.login.signIn}
    </Button>
  );
}
