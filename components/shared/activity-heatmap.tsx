"use client";

import React, { useMemo } from "react";

interface ActivityHeatmapProps {
  data: { date: string; amount: number }[];
  role: "TEACHER" | "STUDENT";
}

export function ActivityHeatmap({ data, role }: ActivityHeatmapProps) {
  // Generate last 365 days
  const today = new Date();
  const days = useMemo(() => {
    const arr = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split("T")[0]);
    }
    return arr;
  }, [today]);

  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.amount));
    return map;
  }, [data]);

  const maxAmount = useMemo(() => {
    return Math.max(1, ...data.map((d) => d.amount));
  }, [data]);

  // Group by weeks for the grid (columns)
  // We have 365 days, which is ~52 weeks.
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];
  
  // Make sure the first day aligns with the correct day of the week
  const firstDay = new Date(days[0]);
  const emptyDaysAtStart = firstDay.getDay(); // 0 is Sunday
  
  for (let i = 0; i < emptyDaysAtStart; i++) {
    currentWeek.push(null);
  }

  days.forEach((dayStr) => {
    currentWeek.push(dayStr);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="min-w-[800px] flex gap-1 items-start text-xs text-muted-foreground">
        <div className="flex flex-col gap-1 pr-2 pt-5">
          <div className="h-3">Sun</div>
          <div className="h-3"></div>
          <div className="h-3">Tue</div>
          <div className="h-3"></div>
          <div className="h-3">Thu</div>
          <div className="h-3"></div>
          <div className="h-3">Sat</div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {/* Months header could be added here, but keep it simple for now */}
          <div className="flex gap-1 h-4 items-end mb-1">
             {/* A placeholder for month labels */}
          </div>
          <div className="flex gap-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((dayStr, dIdx) => {
                  if (!dayStr) {
                    return <div key={dIdx} className="w-3 h-3 rounded-sm bg-transparent" />;
                  }
                  const amount = dataMap.get(dayStr) || 0;
                  // Calculate opacity based on maxAmount
                  // Let's use quantiles for better visuals
                  let intensityClass = "bg-muted";
                  if (amount > 0) {
                    const ratio = amount / maxAmount;
                    if (ratio > 0.75) intensityClass = "bg-primary";
                    else if (ratio > 0.5) intensityClass = "bg-primary/75";
                    else if (ratio > 0.25) intensityClass = "bg-primary/50";
                    else intensityClass = "bg-primary/25";
                  }

                  return (
                    <div
                      key={dayStr}
                      title={`${dayStr}: ${amount} ${role === "TEACHER" ? "NPR" : "questions"}`}
                      className={`w-3 h-3 rounded-sm ${intensityClass} hover:ring-1 hover:ring-ring transition-all cursor-pointer`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
