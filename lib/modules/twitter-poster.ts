import { emitProgress } from "../progress";
import crypto from "crypto";

interface TweetResult {
  tweetId: string;
  url: string;
  text: string;
}

function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessSecret: string
): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const sigBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const sigKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac("sha1", sigKey).update(sigBase).digest("base64");

  oauthParams.oauth_signature = signature;

  const authHeader = "OAuth " +
    Object.keys(oauthParams)
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ");

  return authHeader;
}

export async function postTweet(
  text: string,
  sessionId: string
): Promise<TweetResult | null> {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    emitProgress(sessionId, "X/Twitter: API keys not configured, skipping tweet", "warning");
    return null;
  }

  try {
    emitProgress(sessionId, "X/Twitter: Posting tweet...", "info");

    const url = "https://api.twitter.com/2/tweets";
    const body = JSON.stringify({ text: text.slice(0, 280) });

    const authHeader = oauthSign("POST", url, {}, consumerKey, consumerSecret, accessToken, accessSecret);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json() as { data?: { id: string; text: string } };
    const tweetId = data.data?.id || "";
    const result: TweetResult = {
      tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`,
      text: text.slice(0, 280),
    };

    emitProgress(sessionId, `X/Twitter: Tweet posted → ${result.url}`, "success");
    return result;
  } catch (err) {
    emitProgress(
      sessionId,
      `X/Twitter: ${err instanceof Error ? err.message : "failed to post"}`,
      "warning"
    );
    return null;
  }
}

export function buildSeoTweet(
  businessName: string,
  industry: string,
  websiteUrl: string,
  keywords: string[]
): string {
  const topKws = keywords.slice(0, 3).map((k) => `#${k.replace(/\s+/g, "")}`).join(" ");
  const tweets = [
    `🏙️ Looking for ${industry} in Toronto? ${businessName} delivers expert service across the GTA. Get a free quote today! ${websiteUrl} ${topKws} #Toronto #GTA`,
    `⭐ ${businessName} — trusted ${industry} serving Toronto, Mississauga & the GTA. Residential & commercial. ${websiteUrl} #LocalBusiness #Toronto`,
    `🔧 Top-rated ${industry} in the Greater Toronto Area. ${businessName} is your local expert. ${websiteUrl} ${topKws} #GTA #Toronto`,
  ];
  return tweets[Math.floor(Math.random() * tweets.length)];
}
