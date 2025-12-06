"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { SteamGame } from "../types/steam";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  Gamepad2,
  Quote,
  Target,
  Users,
  Zap,
  Database,
  Share2,
  Download,
  X,
} from "lucide-react";
import {
  getCachedPersonality,
  setCachedPersonality,
  generateGamesHash,
  clearPersonalityCache,
  getPersonalityCacheInfo,
} from "@/lib/cache";
import { useI18n, interpolate } from "@/lib/i18n";
import MBTIShareCard, { MBTI_CONFIG } from "./MBTIShareCard";
import { toPng } from "html-to-image";
import { useGamesStore } from "@/lib/stores/useGamesStore";

interface SignatureGame {
  name: string;
  reason: string;
  genre?: string;
  category?: string;
}

interface GamingStyle {
  playtimePattern: string;
  decisionMaking: string;
  socialPreference: string;
}

interface MBTIResult {
  mbtiType: string;
  confidence: number;
  dimensions: {
    EI: { result: string; score: number; reason: string };
    SN: { result: string; score: number; reason: string };
    TF: { result: string; score: number; reason: string };
    JP: { result: string; score: number; reason: string };
  };
  personality: {
    title: string;
    subtitle: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    signatureGames: SignatureGame[];
    recommendedGenres: string[];
    gamingStyle: GamingStyle;
    advice: string;
  };
  shareCard?: {
    tagline: string;
    summary: string;
    highlights: string[];
  };
}

interface GamerMBTIProps {
  games: SteamGame[];
  genreData: Array<{ name: string; hours: number; gameCount: number }>;
}

// Helper to get MBTI color from config
const getMBTIColor = (mbtiType: string): string => {
  return MBTI_CONFIG[mbtiType]?.color || "#6366f1";
};

export default function GamerMBTI({ games, genreData }: GamerMBTIProps) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [result, setResult] = useState<MBTIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCache, setLoadingCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Get reviews from Zustand store (already fetched globally)
  const storeReviews = useGamesStore((s) => s.reviews);

  // @ts-expect-error - steamId is custom
  const steamId = session?.user?.steamId as string | undefined;
  const userName = session?.user?.name;
  const userAvatar = session?.user?.image;

  const dimensionLabels: Record<string, [string, string]> = {
    EI: [t.personality.extraversion, t.personality.introversion],
    SN: [t.personality.sensing, t.personality.intuition],
    TF: [t.personality.thinking, t.personality.feeling],
    JP: [t.personality.judging, t.personality.perceiving],
  };

  const stats = useMemo(() => {
    const playedGames = games.filter((g) => g.playtime_forever > 0);
    const unplayedGames = games.filter((g) => g.playtime_forever === 0);
    const totalPlaytime = games.reduce((sum, g) => sum + g.playtime_forever, 0);

    const now = Date.now() / 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60;
    const oneYearAgo = now - 365 * 24 * 60 * 60;

    const recentlyPlayed = games.filter(
      (g) => g.rtime_last_played > twoWeeksAgo
    ).length;
    const oldestUnplayed = games.filter(
      (g) => g.rtime_last_played < oneYearAgo || g.rtime_last_played === 0
    ).length;

    const topGames = [...games]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 15)
      .map((g) => ({
        name: g.name,
        hours: Math.round(g.playtime_forever / 60),
      }));

    const topGenres = genreData.slice(0, 10).map((g) => ({
      name: g.name,
      hours: g.hours,
      count: g.gameCount,
    }));

    return {
      totalGames: games.length,
      playedGames: playedGames.length,
      unplayedGames: unplayedGames.length,
      totalPlaytimeHours: Math.round(totalPlaytime / 60),
      averagePlaytimeHours:
        playedGames.length > 0 ? totalPlaytime / 60 / playedGames.length : 0,
      topGenres,
      topGames,
      recentlyPlayed,
      oldestUnplayed,
      singlePlayerRatio: 0.7,
      indieRatio: 0.3,
      completionRate: playedGames.length / games.length,
    };
  }, [games, genreData]);

  const gamesHash = useMemo(
    () => generateGamesHash(stats.topGames),
    [stats.topGames]
  );

  // Create game icons map for share card
  const gameIconsMap = useMemo(() => {
    const map: Record<string, { appid: number; iconUrl: string }> = {};
    games.forEach((game) => {
      if (game.img_icon_url) {
        map[game.name] = {
          appid: game.appid,
          iconUrl: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
        };
      }
    });
    return map;
  }, [games]);

  // Load from cache on mount (only when games are loaded)
  useEffect(() => {
    const loadFromCache = async () => {
      // Wait for steamId AND games to be loaded before checking cache
      if (!steamId || games.length === 0) {
        // Don't set loadingCache to false yet if games aren't loaded
        if (!steamId) {
          setLoadingCache(false);
        }
        return;
      }

      try {
        const cached = await getCachedPersonality(steamId, gamesHash);
        if (cached) {
          setResult(cached);
          setFromCache(true);
          const cacheInfo = await getPersonalityCacheInfo(steamId);
          setCacheAge(cacheInfo.age);
        }
      } catch (err) {
        console.error("Error loading from cache:", err);
      } finally {
        setLoadingCache(false);
      }
    };

    loadFromCache();
  }, [steamId, gamesHash, games.length]);

  const analyzePersonality = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    // Clear cache if force refresh
    if (forceRefresh && steamId) {
      await clearPersonalityCache(steamId);
    }

    try {
      // Use reviews from Zustand store (already fetched globally)
      const reviews =
        storeReviews.length > 0
          ? { reviews: storeReviews, totalReviews: storeReviews.length }
          : null;

      const res = await fetch("/api/analyze-personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stats,
          reviews,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      setFromCache(false);
      setCacheAge(null);

      // Save to cache
      if (steamId) {
        await setCachedPersonality(steamId, data, stats.topGames);
      }
    } catch (err) {
      console.error("Error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const mbtiColor = result ? getMBTIColor(result.mbtiType) : "#6366f1";

  const generateShareImage = async () => {
    if (!shareCardRef.current) return;

    setGenerating(true);
    try {
      // Wait a bit for images to be converted to data URLs
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataUrl = await toPng(shareCardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `steam-mbti-${result?.mbtiType || "result"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading Cache */}
      {loadingCache && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t.common.loading}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Trigger */}
      {!loadingCache && !result && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t.personality.discoverYourPersonality}
            </h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {interpolate(t.personality.analyzeDescription, {
                games: stats.totalGames,
                hours: stats.totalPlaytimeHours.toLocaleString(),
              })}
            </p>
            <Button
              onClick={() => analyzePersonality(false)}
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.personality.analyzing}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {t.personality.startAnalysis}
                </>
              )}
            </Button>
            {error && <p className="text-destructive text-sm mt-4">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Result Display */}
      {result && (
        <>
          {/* Main MBTI Card */}
          <Card className="overflow-hidden">
            <div
              className="p-8 text-white"
              style={{ backgroundColor: mbtiColor }}
            >
              <div className="flex items-start gap-6 mb-4">
                {/* MBTI Avatar */}
                {MBTI_CONFIG[result.mbtiType] && (
                  <div className="shrink-0">
                    <img
                      src={`/mbti/${MBTI_CONFIG[result.mbtiType].slug}.svg`}
                      alt={result.mbtiType}
                      className="w-32 h-32 object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">
                        {t.personality.yourPersonalityIs}
                      </p>
                      <h1 className="text-5xl font-bold tracking-wider mb-2">
                        {result.mbtiType}
                      </h1>
                      <p className="text-2xl font-medium">
                        {result.personality.title}
                      </p>
                      {result.personality.subtitle && (
                        <p className="text-white/80 mt-1 italic">
                          &ldquo;{result.personality.subtitle}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                        <p className="text-sm">{t.personality.confidence}</p>
                        <p className="text-2xl font-bold">
                          {result.confidence}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-lg">
                {result.personality.description}
              </p>
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzePersonality(true)}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  {t.personality.reAnalyze}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  分享卡片
                </Button>
                {fromCache && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>
                      {t.common.fromCache}
                      {cacheAge &&
                        ` (${Math.round(cacheAge / 1000 / 60 / 60)}${
                          t.common.hoursAgo
                        })`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gaming Style */}
          {result.personality.gamingStyle && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Target className="h-4 w-4" />
                    {t.personality.playtimePattern}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {result.personality.gamingStyle.playtimePattern}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Zap className="h-4 w-4" />
                    {t.personality.decisionStyle}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {result.personality.gamingStyle.decisionMaking}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Users className="h-4 w-4" />
                    {t.personality.socialPreference}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {result.personality.gamingStyle.socialPreference}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.personality.dimensionAnalysis}
              </CardTitle>
              <CardDescription>
                {t.personality.dimensionAnalysisDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(result.dimensions).map(([key, dim]) => {
                const labels = dimensionLabels[key];
                const isFirst = dim.result === key[0];

                return (
                  <div key={key} className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span
                        className={
                          !isFirst
                            ? "text-muted-foreground"
                            : "font-semibold text-primary"
                        }
                      >
                        {labels[0]}
                      </span>
                      <span
                        className={
                          isFirst
                            ? "text-muted-foreground"
                            : "font-semibold text-primary"
                        }
                      >
                        {labels[1]}
                      </span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute h-full transition-all"
                        style={{
                          backgroundColor: mbtiColor,
                          width: `${dim.score}%`,
                          left: isFirst ? 0 : "auto",
                          right: isFirst ? "auto" : 0,
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground/30 rounded"
                        style={{
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {dim.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Signature Games */}
          {result.personality.signatureGames &&
            result.personality.signatureGames.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    {t.personality.yourSignatureGames}
                  </CardTitle>
                  <CardDescription>
                    {t.personality.signatureGamesDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.personality.signatureGames.map((game, i) => {
                      const iconInfo = gameIconsMap[game.name];
                      return (
                        <div
                          key={i}
                          className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg"
                        >
                          {iconInfo?.iconUrl ? (
                            <img
                              src={iconInfo.iconUrl}
                              alt={game.name}
                              className="w-12 h-12 rounded-lg shrink-0 shadow-sm"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                              style={{ backgroundColor: mbtiColor }}
                            >
                              {game.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">《{game.name}》</h4>
                              {game.category && (
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                                  style={{ backgroundColor: mbtiColor }}
                                >
                                  {game.category}
                                </span>
                              )}
                              {game.genre && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                  {game.genre}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {game.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  {t.personality.gamingStrengths}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.personality.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">
                        {strength}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  {t.personality.needsAttention}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.personality.weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">
                        {weakness}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Genres */}
          {result.personality.recommendedGenres &&
            result.personality.recommendedGenres.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t.personality.recommendedGenres}
                  </CardTitle>
                  <CardDescription>
                    {t.personality.recommendedGenresDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.personality.recommendedGenres.map((genre, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-sm py-1.5 px-4"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Advice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                {t.personality.aiAdvice}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/20" />
                <p className="text-sm leading-relaxed pl-6">
                  {result.personality.advice}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Share Modal */}
      {showShareModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-[520px] w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">分享你的游戏人格</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Share Card Preview */}
            <div className="p-4 flex justify-center bg-muted/50">
              <MBTIShareCard
                ref={shareCardRef}
                result={result}
                totalGames={stats.totalGames}
                totalHours={stats.totalPlaytimeHours}
                userName={userName || undefined}
                userAvatar={userAvatar || undefined}
                steamId={steamId}
                gameIcons={gameIconsMap}
              />
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex gap-3">
              <Button
                className="flex-1 gap-2"
                onClick={generateShareImage}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    下载图片
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowShareModal(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
