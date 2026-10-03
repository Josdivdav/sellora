"use client";

import { useState, useMemo } from "react";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import styles from "./tabs.module.css";
import chartStyles from "./analytics-charts.module.css";

interface Props {
  store: Store;
  products: Product[];
  orders?: Order[];
  currency: Intl.NumberFormat;
}

type Timeframe = "7D" | "30D" | "12M";
type MetricType = "revenue" | "orders";

const CATEGORY_COLORS = [
  "linear-gradient(135deg, #2b6dff, #38bdf8)",
  "linear-gradient(135deg, #10b981, #34d399)",
  "linear-gradient(135deg, #8b5cf6, #c084fc)",
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #ec4899, #f472b6)",
  "linear-gradient(135deg, #06b6d4, #22d3ee)",
];

export default function MerchantAnalyticsTab({
  store,
  products,
  orders = [],
  currency,
}: Props) {
  // Chart controls
  const [timeframe, setTimeframe] = useState<Timeframe>("7D");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [categoryMetric, setCategoryMetric] = useState<"value" | "units">("value");

  // 1. KPI Calculations
  const catalogValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price * (p.stock ?? 1), 0);
  }, [products]);

  const activeProductsCount = useMemo(() => {
    return products.filter((p) => (p.stock ?? 0) > 0).length;
  }, [products]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "CANCELLED");
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return activeOrders.reduce((acc, order) => {
      const storeItems = (order.items || []).filter(
        (it) => it.storeId === store.id || it.storeName === store.name
      );
      if (storeItems.length > 0) {
        return acc + storeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      }
      return acc + (order.pricing?.total ?? 0);
    }, 0);
  }, [activeOrders, store.id, store.name]);

  const totalUnitsSold = useMemo(() => {
    return activeOrders.reduce((acc, order) => {
      const storeItems = (order.items || []).filter(
        (it) => it.storeId === store.id || it.storeName === store.name
      );
      const itemsToCount = storeItems.length > 0 ? storeItems : order.items || [];
      return acc + itemsToCount.reduce((sum, it) => sum + (it.quantity ?? 1), 0);
    }, 0);
  }, [activeOrders, store.id, store.name]);

  const avgOrderValue = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    return totalRevenue / activeOrders.length;
  }, [totalRevenue, activeOrders.length]);

  const avgRating = useMemo(() => {
    if (store.rating && store.rating > 0) return store.rating;
    if (products.length > 0) {
      return products.reduce((acc, p) => acc + (p.rating ?? 5.0), 0) / products.length;
    }
    return 5.0;
  }, [store.rating, products]);

  // Status Breakdown for Donut Chart
  const statusCounts = useMemo(() => {
    const counts = {
      DELIVERED: 0,
      IN_TRANSIT: 0,
      PROCESSING: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  // 2. Time-series chart points generation
  const timeSeriesData = useMemo(() => {
    const now = new Date();
    const dataPoints: { label: string; dateStr: string; revenue: number; orders: number }[] = [];

    if (timeframe === "7D") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split("T")[0];
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }); // e.g. Mon, Tue

        // Aggregate orders on this day
        let dayRevenue = 0;
        let dayOrdersCount = 0;

        orders.forEach((o) => {
          if (o.createdAt && o.createdAt.startsWith(dayStr)) {
            dayOrdersCount++;
            if (o.status !== "CANCELLED") {
              const storeItems = (o.items || []).filter(
                (it) => it.storeId === store.id || it.storeName === store.name
              );
              if (storeItems.length > 0) {
                dayRevenue += storeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
              } else {
                dayRevenue += o.pricing?.total ?? 0;
              }
            }
          }
        });

        dataPoints.push({
          label: dayLabel,
          dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: dayRevenue,
          orders: dayOrdersCount,
        });
      }
    } else if (timeframe === "30D") {
      // 30 days grouped in 6 intervals of 5 days
      for (let i = 5; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - i * 5);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 4);

        let intervalRevenue = 0;
        let intervalOrders = 0;

        orders.forEach((o) => {
          if (o.createdAt) {
            const oDate = new Date(o.createdAt);
            if (oDate >= dStart && oDate <= dEnd) {
              intervalOrders++;
              if (o.status !== "CANCELLED") {
                const storeItems = (o.items || []).filter(
                  (it) => it.storeId === store.id || it.storeName === store.name
                );
                if (storeItems.length > 0) {
                  intervalRevenue += storeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
                } else {
                  intervalRevenue += o.pricing?.total ?? 0;
                }
              }
            }
          }
        });

        dataPoints.push({
          label: `${dEnd.getDate()} ${dEnd.toLocaleDateString("en-US", { month: "short" })}`,
          dateStr: `${dStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${dEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          revenue: intervalRevenue,
          orders: intervalOrders,
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
              const storeItems = (o.items || []).filter(
                (it) => it.storeId === store.id || it.storeName === store.name
              );
              if (storeItems.length > 0) {
                monthRevenue += storeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
              } else {
                monthRevenue += o.pricing?.total ?? 0;
              }
            }
          }
        });

        dataPoints.push({
          label: monthLabel,
          dateStr: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          revenue: monthRevenue,
          orders: monthOrders,
        });
      }
    }

    return dataPoints;
  }, [orders, timeframe, store.id, store.name]);

  // SVG dimensions & coordinate calculations
  const svgWidth = 720;
  const svgHeight = 240;
  const padLeft = 65;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const graphWidth = svgWidth - padLeft - padRight;
  const graphHeight = svgHeight - padTop - padBottom;

  const values = timeSeriesData.map((d) => (metricType === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...values, 0);
  const maxVal = metricType === "revenue" ? (rawMax > 0 ? rawMax * 1.25 : 50000) : rawMax > 0 ? rawMax + 2 : 10;

  // Grid steps (4 horizontal guidelines)
  const gridSteps = [0, 0.33, 0.66, 1];

  // Coordinates for each point
  const coords = useMemo(() => {
    if (timeSeriesData.length <= 1) return [];
    return timeSeriesData.map((d, index) => {
      const x = padLeft + (index / (timeSeriesData.length - 1)) * graphWidth;
      const val = metricType === "revenue" ? d.revenue : d.orders;
      const y = padTop + graphHeight - (val / maxVal) * graphHeight;
      return { x, y, data: d, value: val };
    });
  }, [timeSeriesData, metricType, maxVal, graphWidth, graphHeight, padLeft, padTop]);

  // Construct smooth SVG path string using Catmull-Rom to Cubic Bezier curve
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: "", areaPath: "" };
    if (coords.length === 1) {
      return {
        linePath: `M ${coords[0].x} ${coords[0].y}`,
        areaPath: `M ${coords[0].x} ${coords[0].y} L ${coords[0].x} ${padTop + graphHeight} Z`,
      };
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      // Control points for smooth spline
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const baseY = padTop + graphHeight;
    const area = `${d} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    return { linePath: d, areaPath: area };
  }, [coords, padTop, graphHeight]);

  // Format Y-axis tick values
  const formatYAxis = (factor: number) => {
    const val = factor * maxVal;
    if (metricType === "revenue") {
      if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `₦${Math.round(val / 1000)}k`;
      return `₦${Math.round(val)}`;
    }
    return Math.round(val).toString();
  };

  // Time-series summary statistics
  const currentPeriodTotal = useMemo(() => {
    return values.reduce((sum, v) => sum + v, 0);
  }, [values]);

  const currentPeriodPeak = useMemo(() => {
    let max = 0;
    let maxDate = "";
    timeSeriesData.forEach((d) => {
      const val = metricType === "revenue" ? d.revenue : d.orders;
      if (val >= max) {
        max = val;
        maxDate = d.dateStr;
      }
    });
    return { value: max, date: maxDate };
  }, [timeSeriesData, metricType]);

  // 3. Donut Chart Calculations (Order Fulfillment Pipeline)
  const totalOrdersCount = orders.length;
  const donutRadius = 66;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~414.69

  const fulfillmentRate = useMemo(() => {
    const validOrders = statusCounts.DELIVERED + statusCounts.IN_TRANSIT + statusCounts.PROCESSING;
    if (validOrders + statusCounts.CANCELLED === 0) return 100;
    return Math.round((statusCounts.DELIVERED / (validOrders + statusCounts.CANCELLED)) * 100);
  }, [statusCounts]);

  const donutSegments = useMemo(() => {
    const list = [
      { key: "DELIVERED", label: "Delivered", count: statusCounts.DELIVERED, color: "#10b981" },
      { key: "IN_TRANSIT", label: "In Transit", count: statusCounts.IN_TRANSIT, color: "#3b82f6" },
      { key: "PROCESSING", label: "Processing", count: statusCounts.PROCESSING, color: "#f59e0b" },
      { key: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED, color: "#ef4444" },
    ];

    const safeTotal = totalOrdersCount > 0 ? totalOrdersCount : 1;
    let accumulatedOffset = 0;

    return list.map((item) => {
      const pct = (item.count / safeTotal);
      const strokeLength = pct * donutCircumference;
      const strokeDasharray = `${strokeLength} ${donutCircumference - strokeLength}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...item,
        pct: Math.round(pct * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [statusCounts, totalOrdersCount, donutCircumference]);

  // 4. Category Inventory Distribution
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    products.forEach((p) => {
      const cat = p.category || "General";
      const existing = map.get(cat) || { count: 0, value: 0 };
      existing.count += p.stock ?? 1;
      existing.value += p.price * (p.stock ?? 1);
      map.set(cat, existing);
    });

    const list = Array.from(map.entries()).map(([cat, data], idx) => ({
      name: cat,
      count: data.count,
      value: data.value,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));

    return list.sort((a, b) => (categoryMetric === "value" ? b.value - a.value : b.count - a.count));
  }, [products, categoryMetric]);

  const maxCategoryMetric = useMemo(() => {
    if (categoryStats.length === 0) return 1;
    return Math.max(...categoryStats.map((c) => (categoryMetric === "value" ? c.value : c.count)), 1);
  }, [categoryStats, categoryMetric]);

  // 5. Top Products Matrix
  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => b.price * (b.stock ?? 1) - a.price * (a.stock ?? 1))
      .slice(0, 5);
  }, [products]);

  const kpis = [
    {
      label: "Total Sales Revenue",
      value: currency.format(totalRevenue),
      icon: "payments",
      bg: "#ecfdf5",
      color: "#059669",
      note: orders.length > 0 ? `${activeOrders.length} active orders` : "Awaiting first order",
    },
    {
      label: "Customer Orders",
      value: orders.length.toString(),
      icon: "receipt_long",
      bg: "#eef2ff",
      color: "#4f46e5",
      note: `${statusCounts.DELIVERED} fulfilled`,
    },
    {
      label: "Units Sold",
      value: totalUnitsSold.toLocaleString(),
      icon: "shopping_bag",
      bg: "#f5f3ff",
      color: "#7c3aed",
      note: totalRevenue > 0 ? `Avg: ${currency.format(avgOrderValue)}` : "Live volume",
    },
    {
      label: "Catalog Valuation",
      value: currency.format(catalogValue),
      icon: "account_balance_wallet",
      bg: "#fffbeb",
      color: "#d97706",
      note: `${activeProductsCount} active listings`,
    },
    {
      label: "Followers & Rating",
      value: `${avgRating.toFixed(1)} ★`,
      icon: "groups",
      bg: "#fff1f2",
      color: "#e11d48",
      note: `${(store.followersCount ?? 0).toLocaleString()} followers`,
    },
  ];

  return (
    <div className={chartStyles.analyticsContainer}>
      {/* Tab Header */}
      <div className={styles.tabHeader} style={{ marginBottom: "16px" }}>
        <h2 className={styles.tabTitle}>Store Analytics &amp; Visual Charts</h2>
        <p className={styles.tabSubtitle}>
          Real-time performance graphs, order fulfillment trends, and category distribution for {store.name}
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className={styles.statRow} style={{ marginBottom: "10px" }}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.statPill}>
            <div className={styles.statPillIcon} style={{ background: k.bg, color: k.color }}>
              <span className="material-icons-round" style={{ fontSize: "20px" }}>{k.icon}</span>
            </div>
            <div>
              <div className={styles.statPillValue}>{k.value}</div>
              <div className={styles.statPillLabel}>{k.label}</div>
              <div style={{ fontSize: "10.5px", color: "#9ca3af", marginTop: "2px" }}>{k.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 1. MAIN TIME-SERIES INTERACTIVE SVG CHART ── */}
      <div className={chartStyles.chartCard}>
        <div className={chartStyles.chartCardHeader}>
          <div className={chartStyles.chartTitleGroup}>
            <h3 className={chartStyles.chartTitle}>
              <span className="material-icons-round" style={{ color: "#2b6dff", fontSize: "20px" }}>
                trending_up
              </span>
              {metricType === "revenue" ? "Sales Revenue Trajectory" : "Order Volume Trajectory"}
            </h3>
            <p className={chartStyles.chartSubtitle}>
              {metricType === "revenue"
                ? "Track gross store sales over time with interactive daily and monthly values"
                : "Monitor customer purchase volume and order frequency across your store"}
            </p>
          </div>

          <div className={chartStyles.controlsRow}>
            {/* Metric Switcher */}
            <div className={chartStyles.segmentedControl}>
              <button
                type="button"
                className={`${chartStyles.segmentedBtn} ${
                  metricType === "revenue" ? chartStyles.segmentedBtnActive : ""
                }`}
                onClick={() => setMetricType("revenue")}
              >
                Revenue (₦)
              </button>
              <button
                type="button"
                className={`${chartStyles.segmentedBtn} ${
                  metricType === "orders" ? chartStyles.segmentedBtnActive : ""
                }`}
                onClick={() => setMetricType("orders")}
              >
                Orders
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div className={chartStyles.segmentedControl}>
              {(["7D", "30D", "12M"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`${chartStyles.segmentedBtn} ${
                    timeframe === tf ? chartStyles.segmentedBtnActive : ""
                  }`}
                  onClick={() => {
                    setTimeframe(tf);
                    setActivePointIndex(null);
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Time-Series Chart */}
        <div className={chartStyles.chartWrap}>
          <svg
            className={chartStyles.svgResponsive}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2b6dff" stopOpacity="0.32" />
                <stop offset="85%" stopColor="#2b6dff" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#2b6dff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {gridSteps.map((factor) => {
              const y = padTop + graphHeight - factor * graphHeight;
              return (
                <g key={factor}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    className={chartStyles.gridLine}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={chartStyles.axisText}
                  >
                    {formatYAxis(factor)}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Labels */}
            {coords.map((c, i) => (
              <text
                key={i}
                x={c.x}
                y={svgHeight - 12}
                textAnchor="middle"
                className={chartStyles.axisText}
              >
                {c.data.label}
              </text>
            ))}

            {/* Filled Gradient Area */}
            {areaPath && (
              <path d={areaPath} fill="url(#areaGradient)" className={chartStyles.chartAreaGradient} />
            )}

            {/* Smooth Curve Line */}
            {linePath && (
              <path d={linePath} className={chartStyles.chartPathLine} />
            )}

            {/* Data Dots & Interactive Circles */}
            {coords.map((c, i) => {
              const isActive = activePointIndex === i;
              return (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isActive ? 6.5 : 4}
                    className={`${chartStyles.dataDot} ${isActive ? chartStyles.dataDotActive : ""}`}
                    onMouseEnter={() => setActivePointIndex(i)}
                  />
                  {/* Invisible enlarged hit target for effortless hover */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={18}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setActivePointIndex(i)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {activePointIndex !== null && coords[activePointIndex] && (
            <div
              className={chartStyles.tooltipCard}
              style={{
                left: `${(coords[activePointIndex].x / svgWidth) * 100}%`,
                top: `${(coords[activePointIndex].y / svgHeight) * 100}%`,
              }}
            >
              <span className={chartStyles.tooltipDate}>
                {coords[activePointIndex].data.dateStr}
              </span>
              <span className={chartStyles.tooltipVal}>
                {metricType === "revenue"
                  ? currency.format(coords[activePointIndex].data.revenue)
                  : `${coords[activePointIndex].data.orders} ${coords[activePointIndex].data.orders === 1 ? "Order" : "Orders"}`}
              </span>
              <span className={chartStyles.tooltipSub}>
                {metricType === "revenue"
                  ? `${coords[activePointIndex].data.orders} orders fulfilled`
                  : currency.format(coords[activePointIndex].data.revenue)}
              </span>
            </div>
          )}
        </div>

        {/* Chart Summary Metrics Bar */}
        <div className={chartStyles.chartSummaryRow}>
          <div className={chartStyles.summaryMetric}>
            <span className={chartStyles.summaryLabel}>Period Aggregate</span>
            <span className={chartStyles.summaryValue}>
              {metricType === "revenue"
                ? currency.format(currentPeriodTotal)
                : `${currentPeriodTotal.toLocaleString()} Orders`}
            </span>
          </div>

          <div className={chartStyles.summaryMetric}>
            <span className={chartStyles.summaryLabel}>Daily Average</span>
            <span className={chartStyles.summaryValue}>
              {metricType === "revenue"
                ? currency.format(Math.round(currentPeriodTotal / timeSeriesData.length))
                : `${(currentPeriodTotal / timeSeriesData.length).toFixed(1)} / day`}
            </span>
          </div>

          <div className={chartStyles.summaryMetric}>
            <span className={chartStyles.summaryLabel}>Peak Milestone</span>
            <span className={chartStyles.summaryValue}>
              {metricType === "revenue"
                ? currency.format(currentPeriodPeak.value)
                : `${currentPeriodPeak.value} Orders`}
            </span>
          </div>

          <div className={chartStyles.summaryMetric}>
            <span className={chartStyles.summaryLabel}>Completion Rate</span>
            <span className={chartStyles.summaryValue} style={{ color: "#10b981" }}>
              {fulfillmentRate}%
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. TWO-COLUMN GRID: DONUT FULFILLMENT + CATEGORY DISTRIBUTION ── */}
      <div className={chartStyles.chartsGrid}>
        {/* Donut Chart: Order Fulfillment Pipeline */}
        <div className={chartStyles.chartCard}>
          <div className={chartStyles.chartCardHeader} style={{ marginBottom: "10px" }}>
            <div className={chartStyles.chartTitleGroup}>
              <h3 className={chartStyles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#10b981", fontSize: "20px" }}>
                  pie_chart
                </span>
                Order Fulfillment Pipeline
              </h3>
              <p className={chartStyles.chartSubtitle}>
                {orders.length} total customer orders received
              </p>
            </div>
          </div>

          <div className={chartStyles.donutFlex}>
            {/* SVG Donut Ring */}
            <div className={chartStyles.donutSvgWrap}>
              <svg className={chartStyles.donutSvg} viewBox="0 0 190 190">
                {/* Background Ring */}
                <circle
                  cx="95"
                  cy="95"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="18"
                />

                {/* Status Segments */}
                {totalOrdersCount > 0 ? (
                  donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="95"
                      cy="95"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="18"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 0.5s ease" }}
                    />
                  ))
                ) : (
                  <circle
                    cx="95"
                    cy="95"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="18"
                  />
                )}
              </svg>

              {/* Center Metrics */}
              <div className={chartStyles.donutCenter}>
                <span className={chartStyles.donutCenterValue}>
                  {totalOrdersCount > 0 ? `${fulfillmentRate}%` : "0%"}
                </span>
                <span className={chartStyles.donutCenterLabel}>
                  {totalOrdersCount > 0 ? "Delivered" : "No Orders"}
                </span>
              </div>
            </div>

            {/* Status Legend */}
            <div className={chartStyles.donutLegend}>
              {donutSegments.map((seg) => (
                <div key={seg.key} className={chartStyles.legendRow}>
                  <div className={chartStyles.legendLabelGroup}>
                    <span className={chartStyles.legendDot} style={{ background: seg.color }} />
                    <span>{seg.label}</span>
                  </div>
                  <div className={chartStyles.legendRight}>
                    <span className={chartStyles.legendCount}>{seg.count}</span>
                    <span className={chartStyles.legendPct}>{seg.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal Bar Chart: Category Inventory Share */}
        <div className={chartStyles.chartCard}>
          <div className={chartStyles.chartCardHeader} style={{ marginBottom: "14px" }}>
            <div className={chartStyles.chartTitleGroup}>
              <h3 className={chartStyles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#8b5cf6", fontSize: "20px" }}>
                  bar_chart
                </span>
                Inventory by Category
              </h3>
              <p className={chartStyles.chartSubtitle}>
                {products.length} products across {categoryStats.length} departments
              </p>
            </div>

            {/* Toggle: Valuation vs Units */}
            <div className={chartStyles.segmentedControl}>
              <button
                type="button"
                className={`${chartStyles.segmentedBtn} ${
                  categoryMetric === "value" ? chartStyles.segmentedBtnActive : ""
                }`}
                onClick={() => setCategoryMetric("value")}
              >
                Valuation
              </button>
              <button
                type="button"
                className={`${chartStyles.segmentedBtn} ${
                  categoryMetric === "units" ? chartStyles.segmentedBtnActive : ""
                }`}
                onClick={() => setCategoryMetric("units")}
              >
                Stock
              </button>
            </div>
          </div>

          {categoryStats.length > 0 ? (
            <div className={chartStyles.barList}>
              {categoryStats.slice(0, 5).map((cat) => {
                const metricVal = categoryMetric === "value" ? cat.value : cat.count;
                const pct = Math.round((metricVal / maxCategoryMetric) * 100);

                return (
                  <div key={cat.name} className={chartStyles.barItem}>
                    <div className={chartStyles.barHeader}>
                      <span className={chartStyles.barCategoryName}>{cat.name}</span>
                      <span className={chartStyles.barValueText}>
                        {categoryMetric === "value"
                          ? currency.format(cat.value)
                          : `${cat.count.toLocaleString()} in stock`}
                      </span>
                    </div>

                    <div className={chartStyles.barTrack}>
                      <div
                        className={chartStyles.barFill}
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          background: cat.color,
                        }}
                      />
                    </div>

                    <div className={chartStyles.barMeta}>
                      <span>{cat.count} total items</span>
                      <span>{categoryMetric === "value" ? `${pct}% of top category` : `${pct}% capacity`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "#64748b", margin: "16px 0 0" }}>
              Add listings to your store to view category distribution charts.
            </p>
          )}
        </div>
      </div>

      {/* ── 3. TOP CATALOG ASSETS PERFORMANCE MATRIX ── */}
      {topProducts.length > 0 && (
        <div className={chartStyles.chartCard}>
          <div className={chartStyles.chartCardHeader}>
            <div className={chartStyles.chartTitleGroup}>
              <h3 className={chartStyles.chartTitle}>
                <span className="material-icons-round" style={{ color: "#d97706", fontSize: "20px" }}>
                  stars
                </span>
                Top Catalog Assets (By Capital Value)
              </h3>
              <p className={chartStyles.chartSubtitle}>
                Highest value inventory items currently listed in your storefront
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {topProducts.map((p, i) => (
              <div key={p.id} className={chartStyles.rankingRow}>
                <div
                  className={`${chartStyles.rankingRank} ${
                    i === 0 ? chartStyles.rankingRankTop : ""
                  }`}
                >
                  #{i + 1}
                </div>

                <img
                  src={p.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=60"}
                  alt={p.name}
                  className={chartStyles.rankingThumb}
                />

                <div className={chartStyles.rankingInfo}>
                  <div className={chartStyles.rankingName}>{p.name}</div>
                  <div className={chartStyles.rankingCategory}>
                    {p.category} {p.sku ? `• SKU: ${p.sku}` : ""}
                  </div>
                </div>

                <div className={chartStyles.rankingStats}>
                  <div className={chartStyles.rankingPrice}>{currency.format(p.price)}</div>
                  <div className={chartStyles.rankingStock}>
                    Stock: <strong>{p.stock ?? 0}</strong> ({currency.format(p.price * (p.stock ?? 1))})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State when no products or orders */}
      {products.length === 0 && orders.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <span className="material-icons-round">analytics</span>
          </div>
          <h3 className={styles.emptyTitle}>No Analytics Data Yet</h3>
          <p className={styles.emptyText}>
            Add products to your store catalog to start tracking live inventory valuations, customer orders, and sales performance charts.
          </p>
        </div>
      )}
    </div>
  );
}
