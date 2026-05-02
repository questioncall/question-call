"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  CalendarIcon,
  CoinsIcon,
  MessageSquareIcon,
  AwardIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface ActivityOverviewProps {
  data: { date: string; amount: number }[];
  role: "TEACHER" | "STUDENT";
}

/**
 * A compact, graphical overview card that replaces the GitHub-style
 * heatmap on the profile overview tab.  It renders:
 *   1. A mini area-chart of the last 90 days
 *   2. Summary stat pills (total, avg, best day)
 *   3. A hover tooltip for each day on the chart
 */
export function ActivityOverview({ data, role }: ActivityOverviewProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    amount: number;
    x: number;
    y: number;
  } | null>(null);

  const isTeacher = role === "TEACHER";

  // ----- Normalise to exactly last 90 days -----
  const chartDays = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.amount));

    const days: { date: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({ date: key, amount: map.get(key) || 0 });
    }
    return days;
  }, [data]);

  // ----- Stats -----
  const stats = useMemo(() => {
    const total = chartDays.reduce((s, d) => s + d.amount, 0);
    const activeDays = chartDays.filter((d) => d.amount > 0).length;
    const avg = activeDays > 0 ? Math.round(total / activeDays) : 0;
    const best = chartDays.reduce(
      (prev, d) => (d.amount > prev.amount ? d : prev),
      { date: "", amount: 0 },
    );

    // 7-day trend
    const last7 = chartDays.slice(-7).reduce((s, d) => s + d.amount, 0);
    const prev7 = chartDays.slice(-14, -7).reduce((s, d) => s + d.amount, 0);
    const trendUp = last7 >= prev7;

    return { total, activeDays, avg, best, last7, prev7, trendUp };
  }, [chartDays]);

  // ----- SVG area chart -----
  const maxVal = useMemo(
    () => Math.max(1, ...chartDays.map((d) => d.amount)),
    [chartDays],
  );

  const svgWidth = 600;
  const svgHeight = 120;
  const padding = { top: 8, right: 4, bottom: 4, left: 4 };
  const innerW = svgWidth - padding.left - padding.right;
  const innerH = svgHeight - padding.top - padding.bottom;

  const points = useMemo(() => {
    return chartDays.map((d, i) => {
      const x = padding.left + (i / (chartDays.length - 1)) * innerW;
      const y =
        padding.top + innerH - (d.amount / maxVal) * innerH;
      return { x, y, ...d };
    });
  }, [chartDays, maxVal, innerW, innerH]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    // Smooth line using catmull-rom approximation
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[Math.max(i - 2, 0)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(i + 1, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const bottom = padding.top + innerH;
    return `${linePath} L ${points[points.length - 1].x},${bottom} L ${points[0].x},${bottom} Z`;
  }, [linePath, points, innerH]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const accentColor = isTeacher ? "#10b981" : "hsl(var(--primary))";
  const accentColorLight = isTeacher
    ? "rgba(16,185,129,0.15)"
    : "hsla(var(--primary), 0.15)";

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ZapIcon className="size-4 text-amber-500" />
          Activity — Last 90 Days
        </h3>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            stats.trendUp
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {stats.trendUp ? (
            <TrendingUpIcon className="size-3" />
          ) : (
            <TrendingDownIcon className="size-3" />
          )}
          {stats.trendUp ? "Trending up" : "Trending down"}
        </div>
      </div>

      {/* Stat pills */}
      <div className="px-6 pb-4 flex flex-wrap gap-3">
        <StatPill
          icon={isTeacher ? CoinsIcon : MessageSquareIcon}
          label="Total"
          value={
            isTeacher ? `NPR ${stats.total}` : `${stats.total} questions`
          }
          accent
        />
        <StatPill
          icon={CalendarIcon}
          label="Active days"
          value={`${stats.activeDays} / 90`}
        />
        <StatPill
          icon={isTeacher ? CoinsIcon : MessageSquareIcon}
          label="Daily avg"
          value={isTeacher ? `NPR ${stats.avg}` : `${stats.avg}`}
        />
        <StatPill
          icon={AwardIcon}
          label="Best day"
          value={
            stats.best.date
              ? `${isTeacher ? "NPR " : ""}${stats.best.amount}`
              : "–"
          }
          subtext={stats.best.date ? formatDate(stats.best.date) : undefined}
        />
      </div>

      {/* Area chart */}
      <div className="relative px-2 pb-4">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredDay(null)}
        >
          <defs>
            <linearGradient
              id="area-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={accentColor}
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={accentColor}
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaPath} fill="url(#area-gradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Invisible hitboxes per day */}
          {points.map((p, i) => (
            <rect
              key={i}
              x={p.x - innerW / chartDays.length / 2}
              y={0}
              width={innerW / chartDays.length}
              height={svgHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (
                  e.currentTarget.closest("svg") as SVGSVGElement
                ).getBoundingClientRect();
                const pctX = (p.x / svgWidth) * rect.width;
                setHoveredDay({
                  date: p.date,
                  amount: p.amount,
                  x: pctX,
                  y: (p.y / svgHeight) * rect.height,
                });
              }}
            />
          ))}

          {/* Hover dot */}
          {hoveredDay && (() => {
            const hp = points.find((p) => p.date === hoveredDay.date);
            if (!hp) return null;
            return (
              <>
                <line
                  x1={hp.x}
                  y1={padding.top}
                  x2={hp.x}
                  y2={padding.top + innerH}
                  stroke={accentColor}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.4"
                />
                <circle
                  cx={hp.x}
                  cy={hp.y}
                  r="4"
                  fill={accentColor}
                  stroke="var(--card)"
                  strokeWidth="2"
                />
              </>
            );
          })()}
        </svg>

        {/* Tooltip */}
        {hoveredDay && (
          <div
            className="absolute z-20 pointer-events-none bg-popover text-popover-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-xs -translate-x-1/2 -translate-y-full"
            style={{
              left: `${hoveredDay.x + 8}px`,
              top: `${hoveredDay.y - 8}px`,
            }}
          >
            <div className="font-semibold mb-0.5">
              {formatDate(hoveredDay.date)}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {isTeacher ? (
                <>
                  <CoinsIcon className="size-3 text-emerald-500" />
                  <span>
                    <span className="text-foreground font-medium">
                      NPR {hoveredDay.amount}
                    </span>{" "}
                    earned
                  </span>
                </>
              ) : (
                <>
                  <MessageSquareIcon className="size-3 text-primary" />
                  <span>
                    <span className="text-foreground font-medium">
                      {hoveredDay.amount}
                    </span>{" "}
                    question{hoveredDay.amount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function StatPill({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
      <Icon
        className={`size-4 shrink-0 ${accent ? "text-emerald-500" : "text-muted-foreground"}`}
      />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none mb-0.5">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground truncate">
          {value}
        </div>
        {subtext && (
          <div className="text-[10px] text-muted-foreground truncate">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
