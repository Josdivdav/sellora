"use client";

import { useState, useMemo } from "react";
import styles from "./developer-charts.module.css";

interface Props {
  users: any[];
  stores: any[];
  orders: any[];
  categories?: string[];
  currency: Intl.NumberFormat;
  summary: any;
}

type Timeframe = "7D" | "30D" | "12M";
type MetricType = "revenue" | "orders";

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "#10b981", // Emerald
  IN_TRANSIT: "#3b82f6", // Blue
  PROCESSING: "#f59e0b", // Amber
  CANCELLED: "#ef4444", // Red
};

const CATEGORY_GRADIENTS = [
  "linear-gradient(90deg, #6366f1, #8b5cf6)",
  "linear-gradient(90deg, #10b981, #34d399)",
  "linear-gradient(90deg, #3b82f6, #60a5fa)",
  "linear-gradient(90deg, #f59e0b, #fbbf24)",
  "linear-gradient(90deg, #ec4899, #f472b6)",
  "linear-gradient(90deg, #14b8a6, #2dd4bf)",
];

export default function DeveloperCharts({
  users = [],
  stores = [],
  orders = [],
  currency,
  summary,
}: Props) {
  // Chart 1 State
  const [timeframe, setTimeframe] = useState<Timeframe>("7D");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Donut Active Segment
  const [activeStatusSegment, setActiveStatusSegment] = useState<string | null>(null);

  // Growth Chart Active Index
  const [activeGrowthIndex, setActiveGrowthIndex] = useState<number | null>(null);

  // ── 1. GENERATE TIME-SERIES DATA FOR REVENUE & GMV ──
  const timeSeriesData = useMemo(() => {
    const now = new Date();
    const dataPoints: {
      label: string;
      fullDate: string;
      revenue: number;
      orders: number;
      usersCount: number;
      storesCount: number;
    }[] = [];

    if (timeframe === "7D") {
      // Last 7 days day by day
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayIso = d.toISOString().split("T")[0];
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

        let dayRevenue = 0;
        let dayOrders = 0;

        orders.forEach((o) => {
          if (o.createdAt && o.createdAt.startsWith(dayIso)) {
            dayOrders++;
            if (o.status !== "CANCELLED") {
              dayRevenue += Number(o.total) || 0;
            }
          }
        });

        const dayUsers = users.filter((u) => u.createdAt && u.createdAt.startsWith(dayIso)).length;
        const dayStores = stores.filter((s) => s.joinedDate && s.joinedDate.startsWith(dayIso)).length;

        dataPoints.push({
          label: dayLabel,
          fullDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          revenue: dayRevenue,
          orders: dayOrders,
          usersCount: dayUsers,
          storesCount: dayStores,
        });
      }
    } else if (timeframe === "30D") {
      // 30 days in 6 intervals of 5 days
      for (let i = 5; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - i * 5);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 4);

        let intRevenue = 0;
        let intOrders = 0;

        orders.forEach((o) => {
          if (o.createdAt) {
            const oDate = new Date(o.createdAt);
            if (oDate >= dStart && oDate <= dEnd) {
              intOrders++;
              if (o.status !== "CANCELLED") {
                intRevenue += Number(o.total) || 0;
              }
            }
          }
        });

        const intUsers = users.filter((u) => {
          if (!u.createdAt) return false;
          const uDate = new Date(u.createdAt);
          return uDate >= dStart && uDate <= dEnd;
        }).length;

        const intStores = stores.filter((s) => {
          if (!s.joinedDate) return false;
          const sDate = new Date(s.joinedDate);
          return sDate >= dStart && sDate <= dEnd;
        }).length;

        dataPoints.push({
          label: `${dEnd.getDate()} ${dEnd.toLocaleDateString("en-US", { month: "short" })}`,
          fullDate: `${dStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          revenue: intRevenue,
          orders: intOrders,
          usersCount: intUsers,
          storesCount: intStores,
        });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        let monthRevenue = 0;
        let monthOrders = 0;

        orders.forEach((o) => {
          if (o.createdAt && o.createdAt.startsWith(monthYear)) {
            monthOrders++;
            if (o.status !== "CANCELLED") {
              monthRevenue += Number(o.total) || 0;
            }
          }
        });

        const monthUsers = users.filter((u) => u.createdAt && u.createdAt.startsWith(monthYear)).length;
        const monthStores = stores.filter((s) => s.joinedDate && s.joinedDate.startsWith(monthYear)).length;

        dataPoints.push({
          label: monthLabel,
          fullDate: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          revenue: monthRevenue,
          orders: monthOrders,
          usersCount: monthUsers,
          storesCount: monthStores,
        });
      }
    }

    return dataPoints;
  }, [orders, users, stores, timeframe]);

  // ── 2. SVG CHART DIMENSIONS & BEZIER MATH ──
  const svgWidth = 800;
  const svgHeight = 260;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  const currentValues = timeSeriesData.map((d) => (metricType === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...currentValues, 0);
  const maxVal = metricType === "revenue" ? (rawMax > 0 ? rawMax * 1.25 : 100000) : rawMax > 0 ? rawMax + 3 : 10;

  // Key summary values for active timeframe
  const periodTotalRevenue = timeSeriesData.reduce((acc, d) => acc + d.revenue, 0);
  const periodTotalOrders = timeSeriesData.reduce((acc, d) => acc + d.orders, 0);
  const periodAvgDaily = timeSeriesData.length > 0 ? periodTotalRevenue / timeSeriesData.length : 0;
  const highestPoint = timeSeriesData.reduce((prev, curr) => {
    const valCurr = metricType === "revenue" ? curr.revenue : curr.orders;
    const valPrev = metricType === "revenue" ? prev.revenue : prev.orders;
    return valCurr > valPrev ? curr : prev;
  }, timeSeriesData[0] || { label: "N/A", revenue: 0, orders: 0 });

  // Grid steps (0%, 33%, 66%, 100%)
  const gridSteps = [0, 0.33, 0.66, 1];

  // Point coordinates
  const coords = useMemo(() => {
    if (timeSeriesData.length <= 1) return [];
    return timeSeriesData.map((d, index) => {
      const x = padLeft + (index / (timeSeriesData.length - 1)) * graphWidth;
      const val = metricType === "revenue" ? d.revenue : d.orders;
      const y = padTop + graphHeight - (val / maxVal) * graphHeight;
      return { x, y, data: d, value: val };
    });
  }, [timeSeriesData, metricType, maxVal, graphWidth, graphHeight, padLeft, padTop]);

  // Smooth Catmull-Rom Bezier Spline
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: "", areaPath: "" };
    if (coords.length === 1) {
      return {
        linePath: `M ${coords[0].x} ${coords[0].y}`,
        areaPath: `M ${coords[0].x} ${coords[0].y} L ${coords[0].x} ${padTop + graphHeight} Z`,
      };
    }

    const line = (pointA: any, pointB: any) => {
      const lengthX = pointB.x - pointA.x;
      const lengthY = pointB.y - pointA.y;
      return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX),
      };
    };

    const controlPoint = (current: any, previous: any, next: any, reverse?: boolean) => {
      const p = previous || current;
      const n = next || current;
      const smoothing = 0.18;
      const o = line(p, n);
      const angle = o.angle + (reverse ? Math.PI : 0);
      const length = o.length * smoothing;
      const x = current.x + Math.cos(angle) * length;
      const y = current.y + Math.sin(angle) * length;
      return [x, y];
    };

    let path = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const [cpsX, cpsY] = controlPoint(coords[i], coords[i - 1], coords[i + 1]);
      const [cpeX, cpeY] = controlPoint(coords[i + 1], coords[i], coords[i + 2], true);
      path += ` C ${cpsX},${cpsY} ${cpeX},${cpeY} ${coords[i + 1].x},${coords[i + 1].y}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const bottomY = padTop + graphHeight;
    const area = `${path} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;

    return { linePath: path, areaPath: area };
  }, [coords, padTop, graphHeight]);

  // ── 3. STATUS DONUT METRICS ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      DELIVERED: 0,
      IN_TRANSIT: 0,
      PROCESSING: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      const st = o.status || "PROCESSING";
      if (counts[st] !== undefined) counts[st]++;
      else counts.PROCESSING++;
    });
    return counts;
  }, [orders]);

  const totalOrdersCount = orders.length || 1;
  const deliveredSuccessRate = Math.round(((statusCounts.DELIVERED || 0) / totalOrdersCount) * 100);

  const donutSegments = useMemo(() => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPct = 0;

    const keys = ["DELIVERED", "IN_TRANSIT", "PROCESSING", "CANCELLED"];
    return keys.map((key) => {
      const count = statusCounts[key] || 0;
      const pct = (count / totalOrdersCount) * 100;
      const strokeLength = (pct / 100) * circumference;
      const strokeDashoffset = -((accumulatedPct / 100) * circumference);
      accumulatedPct += pct;

      return {
        key,
        label: key.replace("_", " "),
        count,
        pct: Math.round(pct),
        color: STATUS_COLORS[key] || "#94a3b8",
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset,
      };
    });
  }, [statusCounts, totalOrdersCount]);

  // ── 4. STORE CATEGORIES DISTRIBUTION ──
  const categoryStats = useMemo(() => {
    const catMap: Record<string, { count: number; products: number }> = {};
    stores.forEach((s) => {
      const cat = s.category || "General";
      if (!catMap[cat]) catMap[cat] = { count: 0, products: 0 };
      catMap[cat].count++;
      catMap[cat].products += s.productCount || 0;
    });

    const list = Object.entries(catMap).map(([name, stat]) => ({
      name,
      storesCount: stat.count,
      productCount: stat.products,
      sharePct: Math.round((stat.count / (stores.length || 1)) * 100),
    }));

    list.sort((a, b) => b.storesCount - a.storesCount);
    return list.slice(0, 6);
  }, [stores]);

  // ── 5. PLATFORM CONVERSION RATIOS ──
  const totalUsersCount = users.length || 1;
  const merchantsCount = users.filter((u) => u.has_store).length;
  const merchantConversionPct = Math.round((merchantsCount / totalUsersCount) * 100);
  const verifiedStoresCount = stores.filter((s) => s.isVerified).length;
  const verifiedRatePct = Math.round((verifiedStoresCount / (stores.length || 1)) * 100);
  const premiumStoresCount = stores.filter((s) => s.isPremium || s.plan === "Premium").length;
  const premiumRatePct = Math.round((premiumStoresCount / (stores.length || 1)) * 100);

  // Active Tooltip Point
  const activePoint = activePointIndex !== null ? coords[activePointIndex] : null;

  return (
    <div className={styles.chartsRoot}>
      {/* ── Visual KPI Highlights ── */}
      <div className={styles.highlightsGrid}>
        {/* GMV Volume */}
        <div className={styles.highlightCard}>
          <div className={styles.highlightHeader}>
            <span className={styles.highlightTitle}>Platform GMV Volume</span>
            <div className={styles.highlightIcon} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
              <span className="material-icons-round">account_balance_wallet</span>
            </div>
          </div>
          <div className={styles.highlightValue}>{currency.format(summary?.totalGMV || 0)}</div>
          <div className={styles.highlightMeta}>
            <span className={styles.highlightBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              ↑ {deliveredSuccessRate}% Delivered
            </span>
            <span>across {orders.length} total orders</span>
          </div>
        </div>

        {/* Merchant Conversion */}
        <div className={styles.highlightCard}>
          <div className={styles.highlightHeader}>
            <span className={styles.highlightTitle}>Merchant Conversion</span>
            <div className={styles.highlightIcon} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
              <span className="material-icons-round">storefront</span>
            </div>
          </div>
          <div className={styles.highlightValue}>{merchantConversionPct}%</div>
          <div className={styles.highlightMeta}>
            <span className={styles.highlightBadge} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
              {merchantsCount} Merchants
            </span>
            <span>from {users.length} registered accounts</span>
          </div>
        </div>

        {/* Verified Store Trust */}
        <div className={styles.highlightCard}>
          <div className={styles.highlightHeader}>
            <span className={styles.highlightTitle}>Store Trust Rate</span>
            <div className={styles.highlightIcon} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <span className="material-icons-round">verified</span>
            </div>
          </div>
          <div className={styles.highlightValue}>{verifiedRatePct}% Verified</div>
          <div className={styles.highlightMeta}>
            <span className={styles.highlightBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              {verifiedStoresCount} of {stores.length}
            </span>
            <span>official badges granted</span>
          </div>
        </div>

        {/* Premium Monetization */}
        <div className={styles.highlightCard}>
          <div className={styles.highlightHeader}>
            <span className={styles.highlightTitle}>Premium Tier Share</span>
            <div className={styles.highlightIcon} style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
              <span className="material-icons-round">workspace_premium</span>
            </div>
          </div>
          <div className={styles.highlightValue}>{premiumRatePct}% Premium</div>
          <div className={styles.highlightMeta}>
            <span className={styles.highlightBadge} style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
              {premiumStoresCount} Stores
            </span>
            <span>on Premium Tier</span>
          </div>
        </div>
      </div>

      {/* ── FLAGSHIP INTERACTIVE TIME-SERIES CHART (GMV & ORDERS) ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartCardHeader}>
          <div className={styles.chartTitleGroup}>
            <h3 className={styles.chartTitle}>
              <span className="material-icons-round" style={{ color: "#6366f1" }}>show_chart</span>
              <span>Platform GMV &amp; Order Volume Trajectory</span>
            </h3>
            <p className={styles.chartSubtitle}>
              Interactive time-series tracking gross marketplace transactions and order velocity across Nigeria.
            </p>
          </div>

          <div className={styles.chartControls}>
            {/* Metric Toggle */}
            <div className={styles.segmentedGroup}>
              <button
                type="button"
                className={`${styles.segmentedBtn} ${metricType === "revenue" ? styles.segmentedBtnActive : ""}`}
                onClick={() => setMetricType("revenue")}
              >
                <span className="material-icons-round" style={{ fontSize: "14px" }}>payments</span>
                <span>GMV (₦)</span>
              </button>
              <button
                type="button"
                className={`${styles.segmentedBtn} ${metricType === "orders" ? styles.segmentedBtnActive : ""}`}
                onClick={() => setMetricType("orders")}
              >
                <span className="material-icons-round" style={{ fontSize: "14px" }}>shopping_bag</span>
                <span>Orders</span>
              </button>
            </div>

            {/* Timeframe Toggle */}
            <div className={styles.segmentedGroup}>
              {(["7D", "30D", "12M"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`${styles.segmentedBtn} ${timeframe === tf ? styles.segmentedBtnActive : ""}`}
                  onClick={() => {
                    setTimeframe(tf);
                    setActivePointIndex(null);
                  }}
                >
                  {tf === "7D" ? "7 Days" : tf === "30D" ? "30 Days" : "12 Months"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metric Summary Ribbon Row */}
        <div className={styles.metricSummaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Period GMV Volume</span>
            <span className={styles.summaryValue} style={{ color: "#34d399" }}>
              {currency.format(periodTotalRevenue)}
            </span>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Period Orders</span>
            <span className={styles.summaryValue} style={{ color: "#60a5fa" }}>
              {periodTotalOrders} orders
            </span>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Daily Velocity</span>
            <span className={styles.summaryValue}>
              {currency.format(periodAvgDaily)} / day
            </span>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Peak Volume Date</span>
            <span className={styles.summaryValue} style={{ color: "#fbbf24" }}>
              {highestPoint?.label || "N/A"} ({metricType === "revenue" ? currency.format(highestPoint?.revenue || 0) : `${highestPoint?.orders || 0} orders`})
            </span>
          </div>
        </div>

        {/* SVG Interactive Area Chart */}
        <div
          className={styles.svgChartWrap}
          onMouseLeave={() => setActivePointIndex(null)}
        >
          <svg
            className={styles.svgChart}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="devChartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="devLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Guidelines */}
            {gridSteps.map((step, idx) => {
              const y = padTop + graphHeight * (1 - step);
              const val = Math.round(maxVal * step);
              const label =
                metricType === "revenue"
                  ? val >= 1_000_000
                    ? `₦${(val / 1_000_000).toFixed(1)}M`
                    : val >= 1_000
                    ? `₦${(val / 1_000).toFixed(0)}k`
                    : `₦${val}`
                  : String(val);

              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={styles.axisText}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#devChartGradient)"
                className={styles.areaGradient}
              />
            )}

            {/* Line Path */}
            {linePath && (
              <path
                d={linePath}
                className={styles.chartLine}
                stroke="url(#devLineGradient)"
              />
            )}

            {/* Crosshair Line on Active Point */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + graphHeight}
                className={styles.crosshairLine}
              />
            )}

            {/* Data Points */}
            {coords.map((pt, idx) => {
              const isActive = activePointIndex === idx;
              return (
                <g key={idx}>
                  {/* Invisible wide hitbox for easy mouse & touch hovering */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setActivePointIndex(idx)}
                    onTouchStart={() => setActivePointIndex(idx)}
                  />
                  {/* Visual Circle Point */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isActive ? 6 : 4}
                    className={`${styles.chartDataPoint} ${isActive ? styles.chartDataPointActive : ""}`}
                    stroke={isActive ? "#34d399" : "#818cf8"}
                  />
                </g>
              );
            })}

            {/* X-Axis Labels */}
            {coords.map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={svgHeight - 10}
                textAnchor="middle"
                className={styles.axisText}
                style={{
                  fontWeight: activePointIndex === idx ? 800 : 500,
                  fill: activePointIndex === idx ? "#ffffff" : "#64748b",
                }}
              >
                {pt.data.label}
              </text>
            ))}
          </svg>

          {/* Floating Tooltip */}
          {activePoint && (
            <div
              className={styles.chartTooltip}
              style={{
                left: `${(activePoint.x / svgWidth) * 100}%`,
                top: `${(activePoint.y / svgHeight) * 100}%`,
              }}
            >
              <div className={styles.tooltipDate}>{activePoint.data.fullDate}</div>
              <div className={styles.tooltipValue}>
                {metricType === "revenue"
                  ? currency.format(activePoint.data.revenue)
                  : `${activePoint.data.orders} Orders`}
              </div>
              <div className={styles.tooltipSub}>
                {metricType === "revenue"
                  ? `${activePoint.data.orders} order(s) placed`
                  : currency.format(activePoint.data.revenue)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DUAL COLUMN SECONDARY CHARTS ── */}
      <div className={styles.twoColGrid}>
        {/* CHART 2: ORDER LIFECYCLE DONUT */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h3 className={styles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#10b981" }}>donut_large</span>
                <span>Fulfillment &amp; Order Status</span>
              </h3>
              <p className={styles.chartSubtitle}>
                Distribution of marketplace orders by live delivery status.
              </p>
            </div>
          </div>

          <div className={styles.donutFlex}>
            <div className={styles.donutSvgWrap}>
              <svg className={styles.donutSvg} viewBox="0 0 190 190">
                {/* Background Ring */}
                <circle
                  cx="95"
                  cy="95"
                  r="70"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="20"
                />

                {/* Segments */}
                {donutSegments.map((seg) => {
                  const isActive = activeStatusSegment === seg.key;
                  return (
                    <circle
                      key={seg.key}
                      cx="95"
                      cy="95"
                      r="70"
                      className={`${styles.donutSegment} ${isActive ? styles.donutSegmentActive : ""}`}
                      stroke={seg.color}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      onMouseEnter={() => setActiveStatusSegment(seg.key)}
                      onMouseLeave={() => setActiveStatusSegment(null)}
                      style={{
                        opacity: activeStatusSegment && !isActive ? 0.35 : 1,
                      }}
                    />
                  );
                })}
              </svg>

              <div className={styles.donutCenter}>
                <span className={styles.donutCenterValue}>
                  {activeStatusSegment ? statusCounts[activeStatusSegment] : orders.length}
                </span>
                <span className={styles.donutCenterLabel}>
                  {activeStatusSegment ? activeStatusSegment.replace("_", " ") : "Total Orders"}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className={styles.donutLegend}>
              {donutSegments.map((seg) => {
                const isActive = activeStatusSegment === seg.key;
                return (
                  <div
                    key={seg.key}
                    className={`${styles.legendRow} ${isActive ? styles.legendRowActive : ""}`}
                    onMouseEnter={() => setActiveStatusSegment(seg.key)}
                    onMouseLeave={() => setActiveStatusSegment(null)}
                  >
                    <div className={styles.legendLeft}>
                      <span className={styles.legendDot} style={{ background: seg.color }} />
                      <span className={styles.legendName}>{seg.label}</span>
                    </div>
                    <div className={styles.legendRight}>
                      <span className={styles.legendCount}>{seg.count}</span>
                      <span className={styles.legendPct}>{seg.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHART 3: USER & STORE ONBOARDING GROWTH */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h3 className={styles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#38bdf8" }}>bar_chart</span>
                <span>User &amp; Store Onboarding</span>
              </h3>
              <p className={styles.chartSubtitle}>
                New account signups vs merchant store setups ({timeframe === "7D" ? "Past 7 Days" : timeframe === "30D" ? "Past 30 Days" : "Past 12 Months"}).
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", fontSize: "11.5px", fontWeight: 700 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#a5b4fc" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#6366f1" }} />
                <span>Users</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#34d399" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#10b981" }} />
                <span>Stores</span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Columns */}
          <div className={styles.growthBarsContainer}>
            {timeSeriesData.map((d, idx) => {
              const maxGrowthVal = Math.max(...timeSeriesData.map((p) => Math.max(p.usersCount, p.storesCount)), 1);
              const userHeight = Math.max(Math.round((d.usersCount / maxGrowthVal) * 130), 6);
              const storeHeight = Math.max(Math.round((d.storesCount / maxGrowthVal) * 130), 4);
              const isHovered = activeGrowthIndex === idx;

              return (
                <div
                  key={idx}
                  className={styles.growthBarCol}
                  onMouseEnter={() => setActiveGrowthIndex(idx)}
                  onMouseLeave={() => setActiveGrowthIndex(null)}
                >
                  <div className={styles.growthPillGroup}>
                    <div
                      className={styles.growthPillUser}
                      style={{
                        height: `${userHeight}px`,
                        filter: isHovered ? "brightness(1.2)" : "none",
                      }}
                      title={`${d.usersCount} users`}
                    />
                    <div
                      className={styles.growthPillStore}
                      style={{
                        height: `${storeHeight}px`,
                        filter: isHovered ? "brightness(1.2)" : "none",
                      }}
                      title={`${d.storesCount} stores`}
                    />
                  </div>
                  <span
                    className={styles.growthColLabel}
                    style={{ color: isHovered ? "#ffffff" : "#64748b" }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Bar Highlight Info */}
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
            {activeGrowthIndex !== null && timeSeriesData[activeGrowthIndex] ? (
              <span>
                <strong>{timeSeriesData[activeGrowthIndex].fullDate}:</strong>{" "}
                <span style={{ color: "#a5b4fc" }}>{timeSeriesData[activeGrowthIndex].usersCount} new users</span> •{" "}
                <span style={{ color: "#34d399" }}>{timeSeriesData[activeGrowthIndex].storesCount} stores</span>
              </span>
            ) : (
              <span>Hover over columns to inspect period onboarding numbers.</span>
            )}
            <span style={{ color: "#64748b" }}>Ratio: {merchantConversionPct}% merchants</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3: CATEGORY DISTRIBUTION & ECOSYSTEM RATIOS ── */}
      <div className={styles.twoColGrid}>
        {/* CHART 4: STORE CATEGORY DISTRIBUTION */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h3 className={styles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#c084fc" }}>category</span>
                <span>Store Category Ecosystem</span>
              </h3>
              <p className={styles.chartSubtitle}>
                Marketplace sector distribution across merchant storefronts.
              </p>
            </div>
          </div>

          <div className={styles.barList}>
            {categoryStats.length === 0 ? (
              <div className={styles.emptyChart}>
                <span className="material-icons-round" style={{ fontSize: "28px" }}>category</span>
                <span>No store categories registered yet.</span>
              </div>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={cat.name} className={styles.barItem}>
                  <div className={styles.barHeader}>
                    <span className={styles.barCategoryName}>
                      <span className="material-icons-round" style={{ fontSize: "14px", color: "#a5b4fc" }}>
                        storefront
                      </span>
                      {cat.name}
                    </span>
                    <span className={styles.barValueText}>
                      {cat.storesCount} stores ({cat.sharePct}%)
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.max(cat.sharePct, 6)}%`,
                        background: CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length],
                      }}
                    />
                  </div>
                  <div className={styles.barMeta}>
                    <span>Catalog items: {cat.productCount}</span>
                    <span>Share of total: {cat.sharePct}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CHART 5: PLATFORM CONVERSION & MONETIZATION GAUGE */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleGroup}>
              <h3 className={styles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#f472b6" }}>pie_chart_outline</span>
                <span>Platform Monetization &amp; Trust Health</span>
              </h3>
              <p className={styles.chartSubtitle}>
                Key conversion funnels for store adoption, verification trust, and paid subscriptions.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Funnel 1: User to Merchant Conversion */}
            <div className={styles.splitProgressContainer}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                <span style={{ fontWeight: 700, color: "#ffffff" }}>Shopper-to-Merchant Adoption</span>
                <span style={{ color: "#a5b4fc", fontWeight: 800 }}>{merchantConversionPct}%</span>
              </div>
              <div className={styles.splitProgressBar}>
                <div style={{ width: `${merchantConversionPct}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
                <div style={{ width: `${100 - merchantConversionPct}%`, background: "rgba(255, 255, 255, 0.05)" }} />
              </div>
              <div className={styles.splitLegend}>
                <span>{merchantsCount} Store Owners</span>
                <span>{users.length - merchantsCount} Pure Shoppers</span>
              </div>
            </div>

            {/* Funnel 2: Store Verification Trust */}
            <div className={styles.splitProgressContainer}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                <span style={{ fontWeight: 700, color: "#ffffff" }}>Store Verification Trust Index</span>
                <span style={{ color: "#34d399", fontWeight: 800 }}>{verifiedRatePct}%</span>
              </div>
              <div className={styles.splitProgressBar}>
                <div style={{ width: `${verifiedRatePct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                <div style={{ width: `${100 - verifiedRatePct}%`, background: "rgba(255, 255, 255, 0.05)" }} />
              </div>
              <div className={styles.splitLegend}>
                <span>{verifiedStoresCount} Verified Stores</span>
                <span>{stores.length - verifiedStoresCount} Unverified</span>
              </div>
            </div>

            {/* Funnel 3: Premium Merchant Plan Share */}
            <div className={styles.splitProgressContainer}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                <span style={{ fontWeight: 700, color: "#ffffff" }}>Premium Merchant Tier Penetration</span>
                <span style={{ color: "#c084fc", fontWeight: 800 }}>{premiumRatePct}%</span>
              </div>
              <div className={styles.splitProgressBar}>
                <div style={{ width: `${premiumRatePct}%`, background: "linear-gradient(90deg, #a855f7, #c084fc)" }} />
                <div style={{ width: `${100 - premiumRatePct}%`, background: "rgba(255, 255, 255, 0.05)" }} />
              </div>
              <div className={styles.splitLegend}>
                <span>{premiumStoresCount} Premium Stores</span>
                <span>{stores.length - premiumStoresCount} Starter Tier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
