"use client";

import { forwardRef, useEffect, useState } from "react";

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
    signatureGames: Array<{
      name: string;
      reason: string;
      genre?: string;
      category?: string;
    }>;
    gamingStyle: {
      playtimePattern: string;
      decisionMaking: string;
      socialPreference: string;
    };
  };
  shareCard?: {
    tagline: string;
    summary: string;
    highlights: string[];
  };
}

interface GameIconMap {
  [gameName: string]: {
    appid: number;
    iconUrl: string;
  };
}

interface MBTIShareCardProps {
  result: MBTIResult;
  totalGames: number;
  totalHours: number;
  userName?: string;
  userAvatar?: string;
  steamId?: string;
  gameIcons?: GameIconMap;
}

// 16personalities official styling - exported for use in other components
export const MBTI_CONFIG: Record<
  string,
  {
    name: string;
    slug: string;
    color: string;
    bgColor: string;
    gradient: string;
    group: string;
  }
> = {
  // Analysts - Purple
  INTJ: {
    name: "建筑师",
    slug: "intj-architect",
    color: "#88619a",
    bgColor: "#f3ebf6",
    gradient: "linear-gradient(135deg, #88619a 0%, #a855f7 100%)",
    group: "分析家",
  },
  INTP: {
    name: "逻辑学家",
    slug: "intp-logician",
    color: "#88619a",
    bgColor: "#f3ebf6",
    gradient: "linear-gradient(135deg, #88619a 0%, #a855f7 100%)",
    group: "分析家",
  },
  ENTJ: {
    name: "指挥官",
    slug: "entj-commander",
    color: "#88619a",
    bgColor: "#f3ebf6",
    gradient: "linear-gradient(135deg, #88619a 0%, #a855f7 100%)",
    group: "分析家",
  },
  ENTP: {
    name: "辩论家",
    slug: "entp-debater",
    color: "#88619a",
    bgColor: "#f3ebf6",
    gradient: "linear-gradient(135deg, #88619a 0%, #a855f7 100%)",
    group: "分析家",
  },
  // Diplomats - Green
  INFJ: {
    name: "提倡者",
    slug: "infj-advocate",
    color: "#33a474",
    bgColor: "#e8f6ef",
    gradient: "linear-gradient(135deg, #33a474 0%, #10b981 100%)",
    group: "外交家",
  },
  INFP: {
    name: "调停者",
    slug: "infp-mediator",
    color: "#33a474",
    bgColor: "#e8f6ef",
    gradient: "linear-gradient(135deg, #33a474 0%, #10b981 100%)",
    group: "外交家",
  },
  ENFJ: {
    name: "主人公",
    slug: "enfj-protagonist",
    color: "#33a474",
    bgColor: "#e8f6ef",
    gradient: "linear-gradient(135deg, #33a474 0%, #10b981 100%)",
    group: "外交家",
  },
  ENFP: {
    name: "竞选者",
    slug: "enfp-campaigner",
    color: "#33a474",
    bgColor: "#e8f6ef",
    gradient: "linear-gradient(135deg, #33a474 0%, #10b981 100%)",
    group: "外交家",
  },
  // Sentinels - Blue
  ISTJ: {
    name: "物流师",
    slug: "istj-logistician",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    gradient: "linear-gradient(135deg, #4298b4 0%, #0ea5e9 100%)",
    group: "守护者",
  },
  ISFJ: {
    name: "守卫者",
    slug: "isfj-defender",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    gradient: "linear-gradient(135deg, #4298b4 0%, #0ea5e9 100%)",
    group: "守护者",
  },
  ESTJ: {
    name: "总经理",
    slug: "estj-executive",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    gradient: "linear-gradient(135deg, #4298b4 0%, #0ea5e9 100%)",
    group: "守护者",
  },
  ESFJ: {
    name: "执政官",
    slug: "esfj-consul",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    gradient: "linear-gradient(135deg, #4298b4 0%, #0ea5e9 100%)",
    group: "守护者",
  },
  // Explorers - Yellow/Orange
  ISTP: {
    name: "鉴赏家",
    slug: "istp-virtuoso",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    gradient: "linear-gradient(135deg, #e4ae3a 0%, #f59e0b 100%)",
    group: "探险家",
  },
  ISFP: {
    name: "探险家",
    slug: "isfp-adventurer",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    gradient: "linear-gradient(135deg, #e4ae3a 0%, #f59e0b 100%)",
    group: "探险家",
  },
  ESTP: {
    name: "企业家",
    slug: "estp-entrepreneur",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    gradient: "linear-gradient(135deg, #e4ae3a 0%, #f59e0b 100%)",
    group: "探险家",
  },
  ESFP: {
    name: "表演者",
    slug: "esfp-entertainer",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    gradient: "linear-gradient(135deg, #e4ae3a 0%, #f59e0b 100%)",
    group: "探险家",
  },
};

const MBTIShareCard = forwardRef<HTMLDivElement, MBTIShareCardProps>(
  (
    { result, totalGames, totalHours, userName, userAvatar, gameIcons },
    ref
  ) => {
    const config = MBTI_CONFIG[result.mbtiType] || MBTI_CONFIG.INTJ;
    const avatarPath = `/mbti/${config.slug}.svg`;
    const [avatarDataUrl, setAvatarDataUrl] = useState<string>("");
    const [userAvatarDataUrl, setUserAvatarDataUrl] = useState<string>("");
    const [gameIconDataUrls, setGameIconDataUrls] = useState<
      Record<string, string>
    >({});

    // Convert images to data URLs for html-to-image compatibility
    useEffect(() => {
      const isExternalUrl = (url: string): boolean => {
        return url.startsWith("http://") || url.startsWith("https://");
      };

      const loadImage = async (url: string): Promise<string> => {
        try {
          const fetchUrl = isExternalUrl(url)
            ? `/api/image-proxy?url=${encodeURIComponent(url)}`
            : url;

          const response = await fetch(fetchUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return url;
        }
      };

      loadImage(avatarPath).then(setAvatarDataUrl);
      if (userAvatar) {
        loadImage(userAvatar).then(setUserAvatarDataUrl);
      }

      if (gameIcons && result.personality.signatureGames) {
        const loadGameIcons = async () => {
          const urls: Record<string, string> = {};
          for (const game of result.personality.signatureGames.slice(0, 4)) {
            const iconInfo = gameIcons[game.name];
            if (iconInfo?.iconUrl) {
              urls[game.name] = await loadImage(iconInfo.iconUrl);
            }
          }
          setGameIconDataUrls(urls);
        };
        loadGameIcons();
      }
    }, [avatarPath, userAvatar, gameIcons, result.personality.signatureGames]);

    return (
      <div
        ref={ref}
        className="w-[420px] overflow-hidden bg-white"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          borderRadius: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Hero Section with Gradient */}
        <div
          className="relative pt-8 pb-6 px-6"
          style={{ background: config.gradient }}
        >
          {/* Decorative circles */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20"
            style={{
              background: "white",
              transform: "translate(30%, -30%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-10"
            style={{
              background: "white",
              transform: "translate(-30%, 30%)",
            }}
          />

          {/* User info bar */}
          <div className="relative flex items-center gap-3 mb-6">
            {userAvatarDataUrl && (
              <img
                src={userAvatarDataUrl}
                alt={userName || "User"}
                className="w-10 h-10 rounded-full border-2 border-white/40"
              />
            )}
            <div className="flex-1">
              {userName && (
                <p className="text-white font-semibold text-sm">{userName}</p>
              )}
              <p className="text-white/70 text-xs">
                {totalGames} 款游戏 · {totalHours.toLocaleString()} 小时
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] uppercase tracking-wider">
                游戏人格
              </p>
            </div>
          </div>

          {/* Main MBTI Display */}
          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl opacity-30"
                style={{ background: "white" }}
              />
              {avatarDataUrl && (
                <img
                  src={avatarDataUrl}
                  alt={result.mbtiType}
                  className="relative w-24 h-24 object-contain drop-shadow-lg"
                />
              )}
            </div>

            {/* Type Info */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <h1 className="text-4xl font-black text-white tracking-wider">
                  {result.mbtiType}
                </h1>
                <span className="text-white/60 text-sm font-medium">
                  {config.group}
                </span>
              </div>
              <p className="text-white text-xl font-bold mb-1">{config.name}</p>
              <p className="text-white/80 text-sm">
                {result.shareCard?.tagline || result.personality.title}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {result.shareCard?.summary && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <p className="text-gray-600 text-sm leading-relaxed">
              「{result.shareCard.summary}」
            </p>
          </div>
        )}

        {/* Dimensions - Progress bar style */}
        <div className="px-6 py-4 bg-white space-y-2">
          {Object.entries(result.dimensions).map(([key, dim]) => {
            const leftLetter = key[0];
            const rightLetter = key[1];
            const isLeft = dim.result === leftLetter;
            // Calculate bar position (0-100, where 50 is center)
            const barPosition = isLeft ? 50 - dim.score / 2 : 50;
            const barWidth = dim.score / 2;

            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`w-5 text-xs font-bold text-right ${
                    isLeft ? "" : "text-gray-300"
                  }`}
                  style={isLeft ? { color: config.color } : undefined}
                >
                  {leftLetter}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      backgroundColor: config.color,
                      left: `${barPosition}%`,
                      width: `${barWidth}%`,
                    }}
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-200" />
                </div>
                <span
                  className={`w-5 text-xs font-bold ${
                    !isLeft ? "" : "text-gray-300"
                  }`}
                  style={!isLeft ? { color: config.color } : undefined}
                >
                  {rightLetter}
                </span>
                <span
                  className="w-8 text-xs font-semibold text-right"
                  style={{ color: config.color }}
                >
                  {dim.score}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Signature Games - Compact row */}
        {result.personality.signatureGames?.length > 0 && (
          <div className="px-6 pb-4 bg-white">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
              代表游戏
            </p>
            <div className="flex gap-2">
              {result.personality.signatureGames.slice(0, 4).map((game, i) => {
                const iconInfo = gameIcons?.[game.name];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    {gameIconDataUrls[game.name] ? (
                      <img
                        src={gameIconDataUrls[game.name]}
                        alt={game.name}
                        className="w-12 h-12 rounded-xl shadow-md mb-1"
                      />
                    ) : iconInfo?.iconUrl ? (
                      <img
                        src={iconInfo.iconUrl}
                        alt={game.name}
                        className="w-12 h-12 rounded-xl shadow-md mb-1"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md mb-1"
                        style={{ backgroundColor: config.color }}
                      >
                        {game.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-[9px] text-gray-500 text-center leading-tight line-clamp-1 w-full">
                      {game.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Highlights as tags */}
        {result.shareCard?.highlights &&
          result.shareCard.highlights.length > 0 && (
            <div className="px-6 pb-4 bg-white">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {result.shareCard.highlights.map((highlight, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.color,
                    }}
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ backgroundColor: config.color }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-white/80"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-white/80 text-xs font-medium">
              Steam 游戏人格分析
            </span>
          </div>
          <span className="text-white/60 text-[10px]">
            https://steam-stats-brown.vercel.app
          </span>
        </div>
      </div>
    );
  }
);

MBTIShareCard.displayName = "MBTIShareCard";

export default MBTIShareCard;
