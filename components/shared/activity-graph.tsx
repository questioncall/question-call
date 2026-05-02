"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2Icon, AlertCircleIcon, CoinsIcon, AlertTriangleIcon,
  TrendingUpIcon, AwardIcon, CalendarIcon, MessageSquareIcon,
  ZapIcon, InfoIcon,
} from "lucide-react";

interface ActivitySummary {
  totalEarned?: number;
  totalPenalty?: number;
  netEarning?: number;
  totalActiveDays: number;
  bestDay: { date: string; amount: number };
  totalAsked?: number;
  totalSolved?: number;
  totalBonuses?: number;
  totalAnswerRewards?: number;
}

interface ActivityDataPoint {
  date: string;
  earned?: number;
  penalty?: number;
  net?: number;
  count?: number;
  questionsAsked?: number;
  solved?: number;
  pending?: number;
  answerRewards?: number;
  bonuses?: number;
  penalties?: number;
}

interface TypeBreakdownItem {
  _id: string;
  total?: number;
  count: number;
}

interface ActivityData {
  role: "TEACHER" | "STUDENT";
  period: string;
  dataPoints: ActivityDataPoint[];
  summary: ActivitySummary;
  typeBreakdown: TypeBreakdownItem[];
  rangeMessage: string | null;
}

interface ActivityGraphProps {
  userId: string;
  role: "TEACHER" | "STUDENT";
  isOwner: boolean;
}

const PERIOD_OPTIONS = [
  { key: "day", range: 30, label: "Daily (30d)" },
  { key: "week", range: 12, label: "Weekly (12w)" },
  { key: "month", range: 12, label: "Monthly (12m)" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  ANSWER_REWARD: "Answer Rewards",
  AUTO_CLOSE_REWARD: "Auto-close Rewards",
  LOW_RATING_PENALTY: "Low Rating Penalty",
  TIMEOUT_PENALTY: "Timeout Penalty",
  MONTHLY_BONUS: "Monthly Bonus",
  DAILY_TARGET_BONUS: "Daily Target Bonus",
  SOLVED: "Solved",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
};

const PIE_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
];

export function ActivityGraph({ userId, role, isOwner }: ActivityGraphProps) {
  const [periodIdx, setPeriodIdx] = useState(2);
  const [customRange, setCustomRange] = useState<{ period: string; range: number } | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customPeriod, setCustomPeriod] = useState("month");
  const [customRangeInput, setCustomRangeInput] = useState("24");
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activePeriod = customRange
    ? customRange.period
    : PERIOD_OPTIONS[periodIdx].key;
  const activeRange = customRange
    ? customRange.range
    : PERIOD_OPTIONS[periodIdx].range;

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/users/activity?userId=${userId}&period=${activePeriod}&range=${activeRange}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("Failed to fetch activity data");
        setData(await res.json());
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [userId, activePeriod, activeRange]);

  const isTeacher = role === "TEACHER";

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground">Detailed Activity</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 border border-border">
            {PERIOD_OPTIONS.map((opt, i) => (
              <button
                key={opt.key}
                onClick={() => { setPeriodIdx(i); setCustomRange(null); }}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  !customRange && periodIdx === i
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
              customRange
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Custom range form */}
      {showCustom && (
        <div className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Period</label>
            <select
              value={customPeriod}
              onChange={(e) => setCustomPeriod(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="day">Days</option>
              <option value="week">Weeks</option>
              <option value="month">Months</option>
              <option value="year">Years</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Range</label>
            <input
              type="number"
              min="1"
              max="120"
              value={customRangeInput}
              onChange={(e) => setCustomRangeInput(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm w-20"
            />
          </div>
          <button
            onClick={() => {
              const r = parseInt(customRangeInput, 10);
              if (r > 0) {
                setCustomRange({ period: customPeriod, range: r });
                setShowCustom(false);
              }
            }}
            className="px-4 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Range message */}
      {data?.rangeMessage && !loading && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <InfoIcon className="size-4 mt-0.5 shrink-0" />
          <span>{data.rangeMessage}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center py-16 text-destructive gap-2">
          <AlertCircleIcon className="size-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <SummaryCards data={data} isTeacher={isTeacher} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - takes 2 cols */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {isTeacher ? "Earnings & Penalties" : "Questions Over Time"}
              </h4>
              <BarChart data={data} isTeacher={isTeacher} />
            </div>

            {/* Pie Chart */}
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {isTeacher ? "Earnings Breakdown" : "Question Status"}
              </h4>
              <PieChart breakdown={data.typeBreakdown} isTeacher={isTeacher} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================== Summary Cards ====================== */
function SummaryCards({ data, isTeacher }: { data: ActivityData; isTeacher: boolean }) {
  const s = data.summary;
  if (isTeacher) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SCard icon={CoinsIcon} label="Total Earned" value={`NPR ${s.totalEarned ?? 0}`} color="text-emerald-500" />
        <SCard icon={AlertTriangleIcon} label="Total Penalty" value={`NPR ${s.totalPenalty ?? 0}`} color="text-destructive" />
        <SCard icon={TrendingUpIcon} label="Net Earnings" value={`NPR ${s.netEarning ?? 0}`} color={(s.netEarning ?? 0) >= 0 ? "text-emerald-500" : "text-destructive"} />
        <SCard icon={AwardIcon} label="Bonuses" value={`NPR ${s.totalBonuses ?? 0}`} color="text-amber-500" />
        <SCard icon={CalendarIcon} label="Active Periods" value={`${s.totalActiveDays}`} color="text-foreground" sub={s.bestDay?.date ? `Best: ${s.bestDay.date}` : undefined} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SCard icon={MessageSquareIcon} label="Total Asked" value={`${s.totalAsked ?? 0}`} color="text-primary" />
      <SCard icon={ZapIcon} label="Total Solved" value={`${s.totalSolved ?? 0}`} color="text-emerald-500" />
      <SCard icon={CalendarIcon} label="Active Periods" value={`${s.totalActiveDays}`} color="text-foreground" />
      <SCard icon={AwardIcon} label="Best Period" value={`${s.bestDay?.amount ?? 0} questions`} color="text-amber-500" sub={s.bestDay?.date || undefined} />
    </div>
  );
}

function SCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`text-xl font-bold ${color} truncate`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

/* ====================== Bar Chart (SVG) ====================== */
function BarChart({ data, isTeacher }: { data: ActivityData; isTeacher: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const dp = data.dataPoints;

  if (dp.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
        No activity found for this period.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...dp.map((d) =>
      isTeacher ? (d.earned || 0) + (d.penalty || 0) : (d.questionsAsked || 0),
    ),
  );

  const svgW = 700;
  const svgH = 240;
  const pad = { top: 24, right: 12, bottom: 32, left: 12 };
  const iW = svgW - pad.left - pad.right;
  const iH = svgH - pad.top - pad.bottom;
  const barW = Math.min(36, iW / dp.length - 4);
  const gap = (iW - barW * dp.length) / (dp.length + 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[500px] h-auto select-none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={pad.left}
            y1={pad.top + iH * (1 - r)}
            x2={pad.left + iW}
            y2={pad.top + iH * (1 - r)}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray={r === 0 ? "0" : "4 4"}
          />
        ))}

        {dp.map((d, i) => {
          const x = pad.left + gap + i * (barW + gap);
          const earnVal = isTeacher ? d.earned || 0 : d.questionsAsked || 0;
          const penVal = isTeacher ? d.penalty || 0 : 0;
          const earnH = (earnVal / maxVal) * iH;
          const penH = (penVal / maxVal) * iH;
          const isHov = hovered === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {/* Invisible hitbox */}
              <rect x={x - 2} y={pad.top} width={barW + 4} height={iH} fill="transparent" />

              {/* Earned bar */}
              <rect
                x={x}
                y={pad.top + iH - earnH}
                width={barW}
                height={Math.max(earnH, 0)}
                rx={3}
                fill={isTeacher ? (isHov ? "#10b981" : "#10b98199") : (isHov ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)")}
                className="transition-all duration-150"
              />

              {/* Penalty bar (stacked on top) */}
              {penVal > 0 && (
                <rect
                  x={x}
                  y={pad.top + iH - earnH - penH}
                  width={barW}
                  height={penH}
                  rx={3}
                  fill={isHov ? "hsl(var(--destructive))" : "hsl(var(--destructive) / 0.6)"}
                  className="transition-all duration-150"
                />
              )}

              {/* Label */}
              <text
                x={x + barW / 2}
                y={svgH - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="9"
              >
                {d.date.length > 7 ? d.date.slice(5) : d.date.slice(2)}
              </text>

              {/* Tooltip */}
              {isHov && (
                <g>
                  <rect
                    x={Math.min(x - 30, svgW - 140)}
                    y={Math.max(pad.top + iH - earnH - penH - 52, 0)}
                    width={130}
                    height={isTeacher ? 48 : 32}
                    rx={6}
                    fill="var(--popover)"
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={Math.min(x - 30, svgW - 140) + 8}
                    y={Math.max(pad.top + iH - earnH - penH - 52, 0) + 16}
                    fontSize="10"
                    fontWeight="600"
                    className="fill-foreground"
                  >
                    {d.date}
                  </text>
                  {isTeacher ? (
                    <>
                      <text
                        x={Math.min(x - 30, svgW - 140) + 8}
                        y={Math.max(pad.top + iH - earnH - penH - 52, 0) + 30}
                        fontSize="9"
                        className="fill-emerald-500"
                      >
                        Earned: NPR {earnVal}
                      </text>
                      <text
                        x={Math.min(x - 30, svgW - 140) + 8}
                        y={Math.max(pad.top + iH - earnH - penH - 52, 0) + 42}
                        fontSize="9"
                        className="fill-destructive"
                      >
                        Penalty: NPR {penVal}
                      </text>
                    </>
                  ) : (
                    <text
                      x={Math.min(x - 30, svgW - 140) + 8}
                      y={Math.max(pad.top + iH - earnH - penH - 52, 0) + 28}
                      fontSize="9"
                      className="fill-muted-foreground"
                    >
                      {earnVal} question{earnVal !== 1 ? "s" : ""}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-sm ${isTeacher ? "bg-emerald-500" : "bg-primary"}`} />
          {isTeacher ? "Earnings" : "Questions"}
        </span>
        {isTeacher && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-destructive" />
            Penalties
          </span>
        )}
      </div>
    </div>
  );
}

/* ====================== Pie Chart (SVG) ====================== */
function PieChart({ breakdown, isTeacher }: { breakdown: TypeBreakdownItem[]; isTeacher: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = useMemo(() => {
    if (!breakdown || breakdown.length === 0) return [];
    const total = breakdown.reduce((s, b) => s + (isTeacher ? (b.total ?? b.count) : b.count), 0);
    if (total === 0) return [];
    let cumulativeAngle = 0;
    return breakdown.map((b, i) => {
      const value = isTeacher ? (b.total ?? b.count) : b.count;
      const pct = value / total;
      const startAngle = cumulativeAngle;
      cumulativeAngle += pct * 360;
      return {
        label: TYPE_LABELS[b._id] || b._id,
        value,
        pct,
        startAngle,
        endAngle: cumulativeAngle,
        color: PIE_COLORS[i % PIE_COLORS.length],
      };
    });
  }, [breakdown, isTeacher]);

  if (items.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
        No breakdown data available.
      </div>
    );
  }

  const cx = 100, cy = 100, r = 80, ir = 50;

  function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number) {
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((endAngle - 90) * Math.PI) / 180;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const x1 = cx + outerR * Math.cos(s);
    const y1 = cy + outerR * Math.sin(s);
    const x2 = cx + outerR * Math.cos(e);
    const y2 = cy + outerR * Math.sin(e);
    const x3 = cx + innerR * Math.cos(e);
    const y3 = cy + innerR * Math.sin(e);
    const x4 = cx + innerR * Math.cos(s);
    const y4 = cy + innerR * Math.sin(s);
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-full max-w-[200px] h-auto">
        {items.map((item, i) => {
          const isHov = hoveredIdx === i;
          const oR = isHov ? r + 6 : r;
          return (
            <path
              key={i}
              d={arcPath(item.startAngle, item.endAngle - 0.5, oR, ir)}
              fill={item.color}
              opacity={hoveredIdx !== null && !isHov ? 0.4 : 1}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
        {/* Center label */}
        {hoveredIdx !== null && items[hoveredIdx] && (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-foreground">
              {(items[hoveredIdx].pct * 100).toFixed(1)}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" className="fill-muted-foreground">
              {items[hoveredIdx].label}
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${hoveredIdx === i ? "bg-muted" : ""}`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate text-foreground">{item.label}</span>
            <span className="ml-auto text-muted-foreground font-medium tabular-nums">
              {isTeacher ? `NPR ${item.value}` : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
