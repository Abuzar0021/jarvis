"use client";

import { useStore } from "@/lib/store";
import { Monitor, ExternalLink } from "lucide-react";

export function BrowserView() {
  const screenshot = useStore((s) => s.latestScreenshot);
  const url = useStore((s) => s.screenshotUrl);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-sky-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Browser View
          </h3>
        </div>
        {url && (
          <div className="flex items-center gap-1.5 rounded bg-gray-800 px-2 py-1">
            <span className="max-w-[200px] truncate text-xs text-gray-400">{url}</span>
            <ExternalLink className="h-3 w-3 text-gray-500" />
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Browser screenshot"
            className="h-full w-full rounded object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <Monitor className="h-12 w-12" />
            <p className="text-sm">No browser session active</p>
            <p className="text-xs">Screenshots stream here when the browser agent runs</p>
          </div>
        )}
      </div>
    </div>
  );
}
