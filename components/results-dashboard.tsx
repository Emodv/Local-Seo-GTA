"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import {
  Download, ExternalLink, Building2, FileText, Megaphone,
  TrendingUp, Star, Twitter, BarChart2, Globe, Search
} from "lucide-react";

interface SemrushKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
}

interface SemrushData {
  domainRank: number;
  organicKeywords: number;
  organicTraffic: number;
  topKeywords: SemrushKeyword[];
  competitors: Array<{ domain: string; commonKeywords: number }>;
}

interface GooglePlacesData {
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  isListed: boolean;
  mapsUrl: string;
  types: string[];
}

interface SessionResult {
  id: string;
  websiteUrl: string;
  industry: string;
  keywords: string[];
  services: string[];
  businessName: string;
  address: string;
  phone: string;
  status: string;
  seoScore?: number;
  semrushData?: SemrushData;
  googlePlacesData?: GooglePlacesData;
  tweetUrl?: string;
  directorySubmissions: Submission[];
  guestPosts: Post[];
  classifiedAds: Ad[];
}

interface Submission {
  id: string;
  directoryName: string;
  directoryUrl: string;
  submittedUrl?: string;
  manualUrl?: string;
  status: string;
  error?: string;
}

interface Post {
  id: string;
  platform: string;
  postUrl?: string;
  title?: string;
  content?: string;
  status: string;
  error?: string;
}

interface Ad {
  id: string;
  platform: string;
  adUrl?: string;
  title?: string;
  content?: string;
  status: string;
  error?: string;
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    submitted: "success",
    completed: "success",
    manual_required: "warning",
    failed: "destructive",
    pending: "secondary",
  };
  return (
    <Badge variant={variantMap[status] || "secondary"} className="text-xs shrink-0">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function ResultsDashboard({ sessionId, result }: { sessionId: string; result: SessionResult }) {
  const [expandedContent, setExpandedContent] = React.useState<string | null>(null);

  const dirStats = {
    submitted: result.directorySubmissions.filter((d) => d.status === "submitted").length,
    manual: result.directorySubmissions.filter((d) => d.status === "manual_required").length,
    failed: result.directorySubmissions.filter((d) => d.status === "failed").length,
  };

  const semrush = result.semrushData;
  const places = result.googlePlacesData;
  const seoScore = result.seoScore ?? 0;

  return (
    <div className="space-y-4">
      {/* SEO Score Hero */}
      {seoScore > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="text-center shrink-0">
                <div className={`text-4xl font-bold ${seoScore >= 70 ? "text-green-400" : seoScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {seoScore}
                </div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">SEO Health Score</span>
                  <span className="text-xs text-muted-foreground">
                    {seoScore >= 70 ? "Good" : seoScore >= 40 ? "Needs Work" : "Critical"}
                  </span>
                </div>
                <Progress value={seoScore} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Directories</span>
            </div>
            <p className="text-2xl font-bold">{result.directorySubmissions.length}</p>
            <p className="text-xs text-muted-foreground">{dirStats.manual} need manual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Guest Posts</span>
            </div>
            <p className="text-2xl font-bold">{result.guestPosts.length}</p>
            <p className="text-xs text-muted-foreground">articles ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Classified Ads</span>
            </div>
            <p className="text-2xl font-bold">{result.classifiedAds.length}</p>
            <p className="text-xs text-muted-foreground">ads generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Industry</span>
            </div>
            <p className="text-sm font-bold leading-tight">{result.industry || "—"}</p>
            <p className="text-xs text-muted-foreground">{result.keywords.length} keywords</p>
          </CardContent>
        </Card>
      </div>

      {/* Google Places + SemRush Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Google Business Status */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Google Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {places ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={places.isListed ? "success" : "destructive"} className="text-xs">
                    {places.isListed ? "✓ Listed on Google" : "Not Listed"}
                  </Badge>
                  {places.isListed && places.mapsUrl && (
                    <a href={places.mapsUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-6 text-xs">View Map</Button>
                    </a>
                  )}
                </div>
                {places.isListed && (
                  <>
                    <p className="text-xs font-medium">{places.name}</p>
                    {places.address && <p className="text-xs text-muted-foreground">{places.address}</p>}
                    {places.phone && <p className="text-xs text-muted-foreground">{places.phone}</p>}
                    {places.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold">{places.rating}</span>
                        <span className="text-xs text-muted-foreground">({places.reviewCount} reviews)</span>
                      </div>
                    )}
                  </>
                )}
                {!places.isListed && (
                  <p className="text-xs text-muted-foreground">
                    Submit via Google Business Profile to appear in Maps &amp; local search.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add GOOGLE_MAPS_API_KEY to enable business validation.
              </p>
            )}
          </CardContent>
        </Card>

        {/* SemRush Overview */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-orange-500" />
              SemRush Domain Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {semrush ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{semrush.organicKeywords.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Keywords</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{semrush.organicTraffic.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Monthly Visits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">#{semrush.domainRank > 0 ? semrush.domainRank.toLocaleString() : "N/A"}</p>
                    <p className="text-xs text-muted-foreground">Domain Rank</p>
                  </div>
                </div>
                {semrush.competitors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Top Competitor:</p>
                    <p className="text-xs text-muted-foreground">
                      {semrush.competitors[0].domain} ({semrush.competitors[0].commonKeywords} shared keywords)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add SEMRUSH_API_KEY to enable real keyword and domain analytics.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tweet posted notification */}
      {result.tweetUrl && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 flex items-center gap-3">
          <Twitter className="h-4 w-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium">Tweet posted to X/Twitter</p>
            <a href={result.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              {result.tweetUrl}
            </a>
          </div>
        </div>
      )}

      {/* SemRush Keywords Table */}
      {semrush?.topKeywords.length ? (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4 text-green-500" />
              Top Ranking Keywords (SemRush — Canada)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-1">
              {semrush.topKeywords.slice(0, 8).map((kw) => (
                <div key={kw.keyword} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                  <span className="font-medium truncate max-w-[50%]">{kw.keyword}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{kw.searchVolume.toLocaleString()} vol/mo</span>
                    <span>CA${kw.cpc.toFixed(2)} CPC</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Keywords */}
      {result.keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Extracted Keywords ({result.keywords.length})</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-1.5">
              {result.keywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => window.open(`/api/export/${sessionId}`, "_blank")}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="directories">
        <TabsList className="w-full">
          <TabsTrigger value="directories" className="flex-1 text-xs">
            Directories ({result.directorySubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 text-xs">
            Guest Posts ({result.guestPosts.length})
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex-1 text-xs">
            Classified Ads ({result.classifiedAds.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directories">
          <ScrollArea className="h-80">
            <div className="space-y-1.5 pr-3">
              {result.directorySubmissions.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{d.directoryName}</p>
                    {d.status === "manual_required" && d.error && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{d.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={d.status} />
                    {(d.submittedUrl || d.manualUrl) && (
                      <a href={d.submittedUrl || d.manualUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="posts">
          <ScrollArea className="h-80">
            <div className="space-y-2 pr-3">
              {result.guestPosts.map((p) => (
                <div key={p.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs">{p.platform}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.title && <p className="text-xs text-muted-foreground mb-1 line-clamp-1">"{p.title}"</p>}
                  {p.error && <p className="text-xs text-blue-400 mb-1">{p.error}</p>}
                  {p.content && (
                    <>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                        onClick={() => setExpandedContent(expandedContent === p.id ? null : p.id)}>
                        {expandedContent === p.id ? "Hide" : "View"} Article
                      </Button>
                      {expandedContent === p.id && (
                        <pre className="text-xs mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-muted-foreground max-h-48 overflow-y-auto">
                          {p.content}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ads">
          <ScrollArea className="h-80">
            <div className="space-y-2 pr-3">
              {result.classifiedAds.map((a) => (
                <div key={a.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs">{a.platform}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.title && <p className="text-xs font-medium text-foreground mb-1 line-clamp-1">"{a.title}"</p>}
                  {a.error && <p className="text-xs text-blue-400 mb-1">{a.error}</p>}
                  {a.content && (
                    <>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                        onClick={() => setExpandedContent(expandedContent === `ad-${a.id}` ? null : `ad-${a.id}`)}>
                        {expandedContent === `ad-${a.id}` ? "Hide" : "View"} Ad
                      </Button>
                      {expandedContent === `ad-${a.id}` && (
                        <pre className="text-xs mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-muted-foreground max-h-36 overflow-y-auto">
                          {a.content}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
