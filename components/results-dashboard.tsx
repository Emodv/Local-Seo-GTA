"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Download, ExternalLink, Building2, FileText, Megaphone, TrendingUp } from "lucide-react";

interface SessionResult {
  id: string;
  websiteUrl: string;
  industry: string;
  keywords: string[];
  services: string[];
  businessName: string;
  status: string;
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

interface ResultsDashboardProps {
  sessionId: string;
  result: SessionResult;
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
    <Badge variant={variantMap[status] || "secondary"} className="text-xs">
      {status.replace("_", " ")}
    </Badge>
  );
}

export function ResultsDashboard({ sessionId, result }: ResultsDashboardProps) {
  const [expandedContent, setExpandedContent] = React.useState<string | null>(null);

  const dirStats = {
    submitted: result.directorySubmissions.filter((d) => d.status === "submitted").length,
    manual: result.directorySubmissions.filter((d) => d.status === "manual_required").length,
    failed: result.directorySubmissions.filter((d) => d.status === "failed").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Directories</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.directorySubmissions.length}</p>
            <p className="text-xs text-muted-foreground">{dirStats.manual} need manual action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Guest Posts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.guestPosts.length}</p>
            <p className="text-xs text-muted-foreground">articles generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Classified Ads</span>
            </div>
            <p className="text-2xl font-bold mt-1">{result.classifiedAds.length}</p>
            <p className="text-xs text-muted-foreground">ads generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Industry</span>
            </div>
            <p className="text-sm font-bold mt-1 leading-tight">{result.industry || "—"}</p>
            <p className="text-xs text-muted-foreground">{result.keywords.length} keywords</p>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      {result.keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Extracted Keywords</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-1.5">
              {result.keywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/export/${sessionId}`, "_blank")}
        >
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
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-2.5 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{d.directoryName}</p>
                    {d.status === "manual_required" && d.error && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {d.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={d.status} />
                    {(d.submittedUrl || d.manualUrl) && (
                      <a
                        href={d.submittedUrl || d.manualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
                  {p.title && <p className="text-xs text-muted-foreground mb-1">{p.title}</p>}
                  {p.error && <p className="text-xs text-blue-400 mb-1">{p.error}</p>}
                  {p.content && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() =>
                          setExpandedContent(expandedContent === p.id ? null : p.id)
                        }
                      >
                        {expandedContent === p.id ? "Hide" : "View"} Article
                      </Button>
                      {expandedContent === p.id && (
                        <pre className="text-xs mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-muted-foreground max-h-48 overflow-y-auto">
                          {p.content}
                        </pre>
                      )}
                    </div>
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
                  {a.title && (
                    <p className="text-xs font-medium text-foreground mb-1">"{a.title}"</p>
                  )}
                  {a.error && <p className="text-xs text-blue-400 mb-1">{a.error}</p>}
                  {a.content && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() =>
                          setExpandedContent(
                            expandedContent === `ad-${a.id}` ? null : `ad-${a.id}`
                          )
                        }
                      >
                        {expandedContent === `ad-${a.id}` ? "Hide" : "View"} Ad Content
                      </Button>
                      {expandedContent === `ad-${a.id}` && (
                        <pre className="text-xs mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-muted-foreground max-h-36 overflow-y-auto">
                          {a.content}
                        </pre>
                      )}
                    </div>
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
