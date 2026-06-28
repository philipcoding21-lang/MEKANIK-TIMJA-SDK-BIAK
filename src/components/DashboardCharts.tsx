import React, { useState } from "react";
import { motion } from "motion/react";

interface BarChartProps {
  data: { bulan: string; jumlah: number }[];
}

export const PemeriksaanBulananChart: React.FC<BarChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.jumlah), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col h-72 justify-between">
      <div className="flex-1 flex items-end gap-3 px-2 pt-4 border-b border-slate-200">
        {data.map((item, idx) => {
          const heightPercent = (item.jumlah / maxVal) * 85; // cap at 85%
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
              {hoveredIdx === idx && (
                <div className="absolute -top-1 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 transition-all pointer-events-none -translate-y-full">
                  Jumlah: {item.jumlah}
                </div>
              )}
              <motion.div
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.6, delay: idx * 0.03, ease: "easeOut" }}
                className={`w-full rounded-t-md cursor-pointer transition-colors ${
                  hoveredIdx === idx ? "bg-cyan-500" : "bg-gradient-to-t from-sky-700 to-sky-400"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-2 pt-2 text-[10px] text-slate-500 font-mono">
        {data.map((item, idx) => (
          <span key={idx} className="flex-1 text-center truncate">
            {item.bulan}
          </span>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: { name: string; value: number }[];
}

export const KetaatanPieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const taat = data.find((d) => d.name === "Taat")?.value || 0;
  const tidakTaat = data.find((d) => d.name === "Tidak Taat")?.value || 0;

  const taatPercent = Math.round((taat / total) * 100);
  const tidakTaatPercent = Math.round((tidakTaat / total) * 100);

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-around h-64 gap-4">
      {/* Circle Representation */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {/* Base Background Circle */}
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          
          {/* Taat Stroke */}
          {taat > 0 && (
            <motion.circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3.2"
              strokeDasharray={`${taatPercent} ${100 - taatPercent}`}
              strokeDashoffset="0"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${taatPercent} ${100 - taatPercent}` }}
              transition={{ duration: 0.8 }}
            />
          )}

          {/* Tidak Taat Stroke */}
          {tidakTaat > 0 && (
            <motion.circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3.2"
              strokeDasharray={`${tidakTaatPercent} ${100 - tidakTaatPercent}`}
              strokeDashoffset={taat > 0 ? -taatPercent : 0}
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${tidakTaatPercent} ${100 - tidakTaatPercent}` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          )}
        </svg>
        <div className="absolute text-center">
          <span className="block text-2xl font-bold font-mono text-slate-800">
            {total === 1 && taat === 0 && tidakTaat === 0 ? 0 : total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
        </div>
      </div>

      {/* Legend and stats */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <div>
            <div className="text-xs text-slate-500 font-medium">Taat Aturan</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {taat} Unit <span className="text-xs font-normal text-slate-400">({taatPercent}%)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <div>
            <div className="text-xs text-slate-500 font-medium font-sans">Tidak Taat Aturan</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {tidakTaat} Unit <span className="text-xs font-normal text-slate-400">({tidakTaatPercent}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SatwasChartProps {
  data: { satwas: string; rataRata: number; jumlah: number }[];
}

export const NilaiSatwasChart: React.FC<SatwasChartProps> = ({ data }) => {
  const maxVal = 100;

  return (
    <div className="w-full flex flex-col gap-4 py-2">
      {data.length === 0 ? (
        <div className="text-center text-slate-400 py-12 text-sm font-sans">Tidak ada data Satwas</div>
      ) : (
        data.map((item, idx) => {
          const percent = (item.rataRata / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={item.satwas}>
                  {item.satwas}
                </span>
                <span className="text-slate-500 font-mono">
                  Rata-rata: <strong className="text-slate-900">{item.rataRata}</strong> ({item.jumlah} Giat)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full bg-gradient-to-r ${
                    item.rataRata >= 90
                      ? "from-emerald-500 to-teal-400"
                      : item.rataRata >= 80
                      ? "from-sky-600 to-cyan-400"
                      : item.rataRata >= 70
                      ? "from-amber-500 to-yellow-400"
                      : "from-rose-500 to-orange-400"
                  }`}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

interface LineChartProps {
  data: { tahun: string; rataRata: number }[];
}

export const TrendTahunanChart: React.FC<LineChartProps> = ({ data }) => {
  const maxVal = 100;
  const padding = 30;
  const height = 180;
  const width = 360;

  // Calculate coordinates for SVG paths
  const points = data.map((item, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (item.rataRata / maxVal) * (height - padding * 2);
    return { x, y, val: item.rataRata, label: item.tahun };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div className="w-full flex flex-col justify-center h-64">
      <div className="relative flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Y Axis Gridlines */}
          {[0, 25, 50, 75, 100].map((grid, idx) => {
            const y = height - padding - (grid / maxVal) * (height - padding * 2);
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                  {grid}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {points.length > 0 && (
            <path
              d={areaD}
              fill="url(#trendAreaGrad)"
              opacity="0.3"
            />
          )}

          {/* Connected Trend Line */}
          {points.length > 0 && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}

          {/* Points circles and labels */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer group">
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#0284c7"
                stroke="#fff"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
              />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-800 font-mono">
                {p.val}
              </text>
              <text x={p.x} y={height - 10} textAnchor="middle" className="text-[9px] fill-slate-400 font-sans">
                {p.label}
              </text>
            </g>
          ))}

          {/* Grad Definition */}
          <defs>
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#ffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
