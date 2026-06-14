"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProgressLog } from "@/components/progress-log";
import { ResultsDashboard } from "@/components/results-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, MapPin, Search, Zap } from "lucide-react";

interface LogEntry {
  message: string;
  type: string;
  timestamp: number;
}

export default function Home() {
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string | null>(null);
  const esRef = React.useRef<EventSource | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setIsRunning(true);
    setLogs([]);
    setResult(null);
    setError(null);
    setSessionId(null);

    if (esRef.current) {
      esRef.current.close();
    }

    try {
      const res = await fetch("/api/run-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          businessName: businessName.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start");
      }

      const { sessionId: sid } = await res.json();
      setSessionId(sid);

      // Subscribe to SSE progress
      const es = new EventSource(`/api/progress/${sid}`);
      esRef.current = es;

      es.onmessage = (event) => {
        const data = JSON.parse(event.data) as LogEntry;
        if (data.type === "done") {
          es.close();
          setIsRunning(false);
          // Fetch final results
          fetch(`/api/results/${sid}`)
            .then((r) => r.json())
            .then(setResult)
            .catch(() => {});
          return;
        }
        setLogs((prev) => [...prev, data]);
      };

      es.onerror = () => {
        es.close();
        setIsRunning(false);
        if (sid) {
          fetch(`/api/results/${sid}`)
            .then((r) => r.json())
            .then(setResult)
            .catch(() => {});
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsRunning(false);
    }
  };

  const handleDemo = () => {
    setWebsiteUrl("https://www.homestars.com");
    setBusinessName("GTA Home Services Demo");
    setAddress("Toronto, ON M5V 2T6");
    setPhone("416-555-0100");
  };

  const handleCancel = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsRunning(false);
    setLogs((prev) => [
      ...prev,
      { message: "Job cancelled by user", type: "warning", timestamp: Date.now() },
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">GTA Local SEO Bot</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
              Greater Toronto Area
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary mb-4">
            <Zap className="h-3 w-3" />
            AI-Powered Local SEO Automation
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Boost Your GTA Business Rankings
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Automatically scan your website, submit to 50+ local directories, generate guest posts,
            and create classified ads — all powered by AI.
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-4 w-4" />
              Start Your SEO Campaign
            </CardTitle>
            <CardDescription>
              Enter your business website URL and optional details to begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Business Website URL <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://www.yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  disabled={isRunning}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                    Business Name (optional)
                  </label>
                  <Input
                    placeholder="Acme Plumbing Co."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                    Address (optional)
                  </label>
                  <Input
                    placeholder="Toronto, ON M5V 2T6"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                    Phone (optional)
                  </label>
                  <Input
                    placeholder="416-555-0100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={isRunning || !websiteUrl.trim()} className="flex-1">
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running SEO Bot...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run SEO Bot
                    </>
                  )}
                </Button>
                {isRunning && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
                {!isRunning && (
                  <Button type="button" variant="outline" onClick={handleDemo}>
                    Load Demo
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {error !== null ? (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 mb-4 text-sm text-destructive">
            {String(error)}
          </div>
        ) : null}

        {/* Progress Log */}
        {(logs.length > 0 || isRunning) && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Progress Log
            </h2>
            <ProgressLog logs={logs} isRunning={isRunning} />
          </div>
        )}

        {/* Results */}
        {result !== null && sessionId !== null ? (
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Results Dashboard
            </h2>
            <ResultsDashboard sessionId={sessionId} result={result as Parameters<typeof ResultsDashboard>[0]["result"]} />
          </div>
        ) : null}

        {/* Feature grid */}
        {!result && !isRunning && logs.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              {
                icon: "🔍",
                title: "AI Site Scanner",
                desc: "Extracts industry, keywords, and services from your website",
              },
              {
                icon: "📁",
                title: "50+ Directories",
                desc: "Submit to local Canadian business directories automatically",
              },
              {
                icon: "✍️",
                title: "Guest Posts",
                desc: "AI-generated articles for Medium, LinkedIn, Hashnode & more",
              },
              {
                icon: "📢",
                title: "Classified Ads",
                desc: "Generate targeted ads for Kijiji, Craigslist, Locanto & more",
              },
            ].map((f) => (
              <Card key={f.title} className="text-center">
                <CardContent className="pt-5 pb-4">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="font-semibold text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground">
        <p>
          GTA Local SEO Bot — For educational use only. Respect each platform&apos;s Terms of
          Service.
        </p>
      </footer>
    </div>
  );
}
