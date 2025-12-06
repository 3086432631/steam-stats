import { NextRequest, NextResponse } from "next/server";

// Batch fetch game details - more efficient than individual requests
// IMPORTANT: Steam API is heavily rate limited, so we use sequential fetching with delays
export async function POST(request: NextRequest) {
  try {
    const { appids } = await request.json();

    if (!appids || !Array.isArray(appids) || appids.length === 0) {
      return NextResponse.json({ error: "appids array is required" }, { status: 400 });
    }

    // Limit to 20 apps per request to reduce rate limiting risk
    const limitedAppids = appids.slice(0, 20);
    
    console.log(`[Steam Apps API] Fetching details for ${limitedAppids.length} apps (sequential)`);

    const results: Record<string, unknown> = {};
    let rateLimitHits = 0;
    const MAX_RATE_LIMIT_HITS = 3; // Stop after 3 rate limit errors
    
    // Sequential fetching with delays to avoid rate limiting
    for (let i = 0; i < limitedAppids.length; i++) {
      const appid = limitedAppids[i];

      // Stop if we've hit rate limit too many times
      if (rateLimitHits >= MAX_RATE_LIMIT_HITS) {
        console.warn(`[Steam Apps API] Too many rate limit errors, stopping early`);
        break;
      }
      
      // Add delay between requests (1.5 seconds)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      try {
        const response = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
          {
            headers: {
              "Accept-Language": "en-US,en;q=0.9",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json",
            },
            next: { revalidate: 86400 }, // Cache for 24 hours
          }
        );

        if (response.status === 403 || response.status === 429) {
          console.warn(`[Steam Apps API] Rate limited at appid=${appid}`);
          rateLimitHits++;
          results[appid] = null;
          // Wait extra time after rate limit
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        if (!response.ok) {
          console.warn(`[Steam Apps API] appid=${appid} returned ${response.status}`);
          results[appid] = null;
          continue;
        }

        const data = await response.json();
        
        if (!data[appid] || !data[appid].success) {
          results[appid] = null;
          continue;
        }

        const gameData = data[appid].data;
        results[appid] = {
          appid: gameData.steam_appid,
          name: gameData.name,
          short_description: gameData.short_description,
          genres: gameData.genres || [],
          categories: gameData.categories || [],
          developers: gameData.developers || [],
          publishers: gameData.publishers || [],
          release_date: gameData.release_date,
          metacritic: gameData.metacritic,
          is_free: gameData.is_free,
          price_overview: gameData.price_overview,
        };
      } catch (err) {
        console.error(`[Steam Apps API] Error fetching appid=${appid}:`, err);
        results[appid] = null;
      }
    }

    const successCount = Object.values(results).filter(v => v !== null).length;
    console.log(`[Steam Apps API] Fetched ${successCount}/${limitedAppids.length} apps successfully`);

    return NextResponse.json({
      results,
      fetched: successCount,
      requested: limitedAppids.length,
      rateLimitHits,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Steam Apps API] Error:`, errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch game details", details: errorMessage },
      { status: 500 }
    );
  }
}

