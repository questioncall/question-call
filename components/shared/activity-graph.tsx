"use client";

import React, { useState, useEffect } from "react";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { ActivityHeatmap } from "./activity-heatmap";

interface ActivitySummary {
  totalEarned?: number;
  totalPenalty?: number;
  netEarning?: number;
  totalActiveDays: number;
  bestDay: { date: string; amount: number };
  totalAsked?: number;
}

interface ActivityDataPoint {
  date: string;
  earned?: number;
  penalty?: number;
  net?: number;
  count?: number;
  questionsAsked?: number;
}

interface ActivityData {
  role: "TEACHER" | "STUDENT";
  period: string;
  dataPoints: ActivityDataPoint[];
  summary: ActivitySummary;
}

interface ActivityGraphProps {
  userId: string;
  role: "TEACHER" | "STUDENT";
  isOwner: boolean;
}

export function ActivityGraph({ userId, role, isOwner }: ActivityGraphProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [range, setRange] = useState(12);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/activity?userId=${userId}&period=${period}&range=${range}`);
        if (!res.ok) {
          throw new Error("Failed to fetch activity data");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, period, range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground">
          Detailed Activity
        </h3>
        <div className="flex bg-muted rounded-lg p-1 border border-border">
          <button
            onClick={() => { setPeriod("day"); setRange(30); }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${period === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => { setPeriod("week"); setRange(12); }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${period === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            12 Weeks
          </button>
          <button
            onClick={() => { setPeriod("month"); setRange(12); }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${period === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            12 Months
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center py-12 text-destructive gap-2">
          <AlertCircleIcon className="size-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {role === "TEACHER" ? (
              <>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Total Earned</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    {data.summary.totalEarned}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Total Penalty</div>
                  <div className="text-2xl font-bold text-destructive">
                    {data.summary.totalPenalty}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Net Earnings</div>
                  <div className={`text-2xl font-bold ${data.summary.netEarning && data.summary.netEarning > 0 ? "text-emerald-500" : "text-foreground"}`}>
                    {data.summary.netEarning}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Best Period</div>
                  <div className="text-lg font-bold truncate">
                    {data.summary.bestDay?.amount || 0}
                    <span className="text-xs text-muted-foreground font-normal ml-1 block">
                      on {data.summary.bestDay?.date || "N/A"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Total Asked</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.summary.totalAsked}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Active Periods</div>
                  <div className="text-2xl font-bold text-foreground">
                    {data.summary.totalActiveDays}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm col-span-2">
                  <div className="text-sm text-muted-foreground mb-1">Best Period</div>
                  <div className="text-lg font-bold">
                    {data.summary.bestDay?.amount || 0} questions
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      on {data.summary.bestDay?.date || "N/A"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm overflow-x-auto">
            <div className="min-w-[600px] h-[300px] flex items-end gap-2 pt-10">
              {data.dataPoints.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No activity found for this period.
                </div>
              ) : (
                (() => {
                  const maxVal = Math.max(
                    1,
                    ...data.dataPoints.map((d) => 
                      role === "TEACHER" ? (d.earned || 0) + (d.penalty || 0) : (d.questionsAsked || 0)
                    )
                  );
                  
                  return data.dataPoints.map((d, i) => {
                    const val = role === "TEACHER" ? d.earned || 0 : d.questionsAsked || 0;
                    const pen = role === "TEACHER" ? d.penalty || 0 : 0;
                    const heightEarned = Math.max(1, (val / maxVal) * 100);
                    const heightPenalty = Math.max(0, (pen / maxVal) * 100);
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-10 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border shadow-md">
                          {d.date}: {role === "TEACHER" ? `${val} earned, ${pen} penalty` : `${val} questions`}
                        </div>
                        
                        {/* Bars */}
                        <div className="w-full max-w-[40px] flex flex-col justify-end h-[calc(100%-24px)]">
                          {pen > 0 && (
                            <div 
                              className="w-full bg-destructive/80 rounded-t-sm" 
                              style={{ height: `${heightPenalty}%` }}
                            />
                          )}
                          <div 
                            className={`w-full ${role === "TEACHER" ? "bg-emerald-500/80" : "bg-primary/80"} ${pen === 0 ? "rounded-t-sm" : ""} rounded-b-sm`} 
                            style={{ height: `${heightEarned}%` }}
                          />
                        </div>
                        
                        {/* Label */}
                        <div className="text-[10px] text-muted-foreground truncate w-full text-center h-[20px] leading-[20px]">
                          {d.date.substring(d.date.length - 5)}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
