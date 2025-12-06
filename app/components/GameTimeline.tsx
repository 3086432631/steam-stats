"use client";

import { useMemo, useState } from "react";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, Sparkles, ArrowRight, ChevronDown, ChevronUp, Gamepad2 } from "lucide-react";

interface GameTimelineProps {
  games: SteamGame[];
}

interface TimelineGroup {
  label: string;
  sublabel?: string;
  games: SteamGame[];
}

export default function GameTimeline({ games }: GameTimelineProps) {
  const [showAllGroups, setShowAllGroups] = useState(false);

  const { timelineGroups, onThisDay, recentlyPlayed, forgottenGems } = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    
    // Sort games by last played time
    const sortedGames = [...games]
      .filter(g => g.rtime_last_played > 0)
      .sort((a, b) => b.rtime_last_played - a.rtime_last_played);
    
    // Group by time periods
    const groups: TimelineGroup[] = [];
    const oneDay = 24 * 60 * 60;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    
    const todayGames: SteamGame[] = [];
    const yesterdayGames: SteamGame[] = [];
    const thisWeekGames: SteamGame[] = [];
    const thisMonthGames: SteamGame[] = [];
    const lastThreeMonthsGames: SteamGame[] = [];
    const thisYearGames: SteamGame[] = [];
    const olderGames: SteamGame[] = [];
    
    const nowTimestamp = now.getTime() / 1000;
    
    sortedGames.forEach(game => {
      const diff = nowTimestamp - game.rtime_last_played;
      
      if (diff < oneDay) {
        todayGames.push(game);
      } else if (diff < 2 * oneDay) {
        yesterdayGames.push(game);
      } else if (diff < oneWeek) {
        thisWeekGames.push(game);
      } else if (diff < oneMonth) {
        thisMonthGames.push(game);
      } else if (diff < 3 * oneMonth) {
        lastThreeMonthsGames.push(game);
      } else if (diff < 365 * oneDay) {
        thisYearGames.push(game);
      } else {
        olderGames.push(game);
      }
    });
    
    if (todayGames.length > 0) groups.push({ label: "Today", games: todayGames });
    if (yesterdayGames.length > 0) groups.push({ label: "Yesterday", games: yesterdayGames });
    if (thisWeekGames.length > 0) groups.push({ label: "This Week", games: thisWeekGames });
    if (thisMonthGames.length > 0) groups.push({ label: "This Month", games: thisMonthGames });
    if (lastThreeMonthsGames.length > 0) groups.push({ label: "Last 3 Months", games: lastThreeMonthsGames });
    if (thisYearGames.length > 0) groups.push({ label: "This Year", games: thisYearGames });
    if (olderGames.length > 0) groups.push({ label: "Older", games: olderGames });
    
    // "On This Day" - games played around this date in previous years
    const onThisDay: Array<{ year: number; games: SteamGame[] }> = [];
    
    for (let yearOffset = 1; yearOffset <= 5; yearOffset++) {
      const targetYear = now.getFullYear() - yearOffset;
      const gamesOnThisDay = sortedGames.filter(game => {
        const lastPlayed = new Date(game.rtime_last_played * 1000);
        return lastPlayed.getFullYear() === targetYear &&
               lastPlayed.getMonth() === currentMonth &&
               Math.abs(lastPlayed.getDate() - today) <= 3; // Within 3 days
      });
      
      if (gamesOnThisDay.length > 0) {
        onThisDay.push({ year: targetYear, games: gamesOnThisDay.slice(0, 5) });
      }
    }
    
    // Recently played (last 7 days) with most hours
    const recentlyPlayed = sortedGames
      .filter(g => (nowTimestamp - g.rtime_last_played) < oneWeek)
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 5);
    
    // Forgotten gems - games with >10h played but not touched in over a year
    const forgottenGems = sortedGames
      .filter(g => 
        g.playtime_forever > 600 && // More than 10 hours
        (nowTimestamp - g.rtime_last_played) > 365 * oneDay
      )
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 10);
    
    return { timelineGroups: groups, onThisDay, recentlyPlayed, forgottenGems };
  }, [games]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTimeSince = (timestamp: number) => {
    const diff = Date.now() / 1000 - timestamp;
    const days = Math.floor(diff / 86400);
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const displayedGroups = showAllGroups ? timelineGroups : timelineGroups.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* On This Day */}
      {onThisDay.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              On This Day
            </CardTitle>
            <CardDescription>
              What you were playing around this time in previous years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onThisDay.map(({ year, games: yearGames }) => (
                <div key={year}>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{year}</p>
                  <div className="flex flex-wrap gap-2">
                    {yearGames.map(game => (
                      <div key={game.appid} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border">
                        <img
                          src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                          alt=""
                          className="w-6 h-6 rounded"
                        />
                        <span className="text-sm">{game.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recently Active */}
        {recentlyPlayed.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Currently Playing
              </CardTitle>
              <CardDescription>Most played this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentlyPlayed.map(game => (
                  <div key={game.appid} className="flex items-center gap-3">
                    <img
                      src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                      alt=""
                      className="w-10 h-10 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(game.playtime_forever / 60)}h total
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatTimeSince(game.rtime_last_played)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forgotten Gems */}
        {forgottenGems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Forgotten Gems
              </CardTitle>
              <CardDescription>Games you loved but haven&apos;t touched in a year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forgottenGems.slice(0, 5).map(game => (
                  <div key={game.appid} className="flex items-center gap-3">
                    <img
                      src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                      alt=""
                      className="w-10 h-10 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(game.playtime_forever / 60)}h played
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {formatTimeSince(game.rtime_last_played)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Activity Timeline
          </CardTitle>
          <CardDescription>
            Games organized by when you last played them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-6">
              {displayedGroups.map((group, groupIndex) => (
                <div key={group.label} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                    groupIndex === 0 ? "bg-primary" : "bg-muted-foreground/50"
                  }`} />
                  
                  <div>
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      {group.label}
                      <Badge variant="secondary" className="text-xs">
                        {group.games.length}
                      </Badge>
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {group.games.slice(0, 12).map(game => (
                        <div key={game.appid} className="group relative">
                          <img
                            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
                            alt={game.name}
                            className="w-full rounded-lg transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div>
                              <p className="text-white text-xs font-medium line-clamp-1">{game.name}</p>
                              <p className="text-white/70 text-[10px]">{formatDate(game.rtime_last_played)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {group.games.length > 12 && (
                        <div className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm">
                          +{group.games.length - 12} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {timelineGroups.length > 4 && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllGroups(!showAllGroups)}
                  className="gap-2"
                >
                  {showAllGroups ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show {timelineGroups.length - 4} More Periods
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

