"use client";

import { useState } from "react";
import { SteamGame } from "../types/steam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, 
  Skull, 
  Shuffle, 
  ExternalLink,
  Clock,
  Sparkles
} from "lucide-react";

interface WallOfShameProps {
  games: SteamGame[];
}

export default function WallOfShame({ games }: WallOfShameProps) {
  const [randomGame, setRandomGame] = useState<SteamGame | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Games with 0 playtime
  const unplayedGames = games.filter(g => g.playtime_forever === 0);
  // Games with less than 1 hour
  const barelyPlayedGames = games.filter(g => g.playtime_forever > 0 && g.playtime_forever < 60);
  
  const shameGames = [...unplayedGames, ...barelyPlayedGames];
  
  const pickRandomGame = () => {
    if (shameGames.length === 0) return;
    
    setIsSpinning(true);
    
    // Simulate spinning effect
    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * shameGames.length);
      setRandomGame(shameGames[randomIndex]);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setIsSpinning(false);
        // Final random selection
        const finalIndex = Math.floor(Math.random() * shameGames.length);
        setRandomGame(shameGames[finalIndex]);
      }
    }, 100);
  };

  const shamePercentage = games.length > 0 
    ? ((shameGames.length / games.length) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <Skull className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-500">{unplayedGames.length}</p>
          <p className="text-xs text-muted-foreground">Never Played</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
          <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-amber-500">{barelyPlayedGames.length}</p>
          <p className="text-xs text-muted-foreground">&lt; 1 Hour</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
          <Gamepad2 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-500">{shameGames.length}</p>
          <p className="text-xs text-muted-foreground">Total Shame</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold">{shamePercentage}%</p>
          <p className="text-xs text-muted-foreground">of Library</p>
        </div>
      </div>

      {/* Random Game Picker */}
      <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
            <Shuffle className="h-5 w-5" />
            Redemption Roulette
          </h3>
          <p className="text-sm text-muted-foreground">
            Give one of your neglected games a chance!
          </p>
          
          {randomGame && (
            <div className="bg-card border rounded-lg p-4 flex items-center gap-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                {randomGame.img_icon_url ? (
                  <img 
                    src={`https://media.steampowered.com/steamcommunity/public/images/apps/${randomGame.appid}/${randomGame.img_icon_url}.jpg`}
                    alt={randomGame.name}
                    className={`w-full h-full object-cover ${isSpinning ? "animate-pulse" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h4 className={`font-medium truncate ${isSpinning ? "blur-sm" : ""}`}>
                  {randomGame.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {randomGame.playtime_forever === 0 
                    ? "Never played" 
                    : `${randomGame.playtime_forever} minutes played`}
                </p>
                {!isSpinning && (
                  <div className="flex gap-2 mt-2">
                    <a href={`steam://run/${randomGame.appid}`}>
                      <Button size="sm" variant="default" className="h-7 text-xs">
                        Play Now
                      </Button>
                    </a>
                    <a 
                      href={`https://store.steampowered.com/app/${randomGame.appid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <Button 
            onClick={pickRandomGame} 
            disabled={shameGames.length === 0 || isSpinning}
            className="gap-2"
          >
            <Shuffle className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
            {isSpinning ? "Spinning..." : "Pick Random Game"}
          </Button>
        </div>
      </Card>

      {/* Unplayed Games Grid */}
      {unplayedGames.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Skull className="h-4 w-4 text-red-500" />
              Never Touched
            </h3>
            <Badge variant="destructive">{unplayedGames.length} games</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {unplayedGames.slice(0, 24).map(game => (
              <a
                key={game.appid}
                href={`steam://run/${game.appid}`}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                title={game.name}
              >
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                  alt={game.name}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white font-medium truncate">{game.name}</p>
                </div>
              </a>
            ))}
          </div>
          {unplayedGames.length > 24 && (
            <p className="text-center text-sm text-muted-foreground">
              +{unplayedGames.length - 24} more unplayed games
            </p>
          )}
        </div>
      )}

      {shameGames.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium text-green-500">Congratulations!</p>
          <p>You&apos;ve played every game in your library!</p>
        </div>
      )}
    </div>
  );
}

