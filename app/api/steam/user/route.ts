import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const steamId = searchParams.get("steamId");

  if (!steamId) {
    return NextResponse.json({ error: "Missing steamId" }, { status: 400 });
  }

  try {
    const response = await axios.get(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_SECRET}&steamids=${steamId}`
    );
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching user summary:", error);
    return NextResponse.json({ error: "Failed to fetch user summary" }, { status: 500 });
  }
}
