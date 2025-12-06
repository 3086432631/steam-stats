"use client";

import { useI18n, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    const newLang: Language = language === "en" ? "zh" : "en";
    setLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      title={language === "en" ? "切换到中文" : "Switch to English"}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">{language === "en" ? "中文" : "EN"}</span>
    </Button>
  );
}

