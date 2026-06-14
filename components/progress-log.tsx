"use client";

import * as React from "react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

interface LogEntry {
  message: string;
  type: string;
  timestamp: number;
}

interface ProgressLogProps {
  logs: LogEntry[];
  isRunning: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />,
  error: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />,
  info: <Info className="h-4 w-4 text-blue-400 shrink-0" />,
};

const textMap: Record<string, string> = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-gray-300",
};

export function ProgressLog({ logs, isRunning }: ProgressLogProps) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="rounded-lg border bg-black/80 font-mono text-sm">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        <span className="text-xs text-muted-foreground">
          {isRunning ? "Running..." : logs.length > 0 ? "Complete" : "Waiting for input"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length} events</span>
      </div>
      <ScrollArea className="h-72 p-4">
        {logs.length === 0 && (
          <p className="text-muted-foreground text-xs">Progress will appear here...</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className={cn("log-entry flex items-start gap-2 mb-1.5")}>
            <span className="text-muted-foreground text-xs mt-0.5 shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            {iconMap[log.type] || iconMap.info}
            <span className={cn("text-xs", textMap[log.type] || textMap.info)}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </ScrollArea>
    </div>
  );
}
