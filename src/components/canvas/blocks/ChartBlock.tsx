'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import type { ChartContent } from '@/types/canvas';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#4f46e5', '#4338ca'];

export function ChartBlock({ content }: { content: ChartContent }) {
  const data = content.data.map((d) => ({ name: d.label, value: d.value }));

  const tooltipStyle = {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--foreground)',
    fontSize: '11px',
  };

  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <ResponsiveContainer width="100%" height={160}>
        {content.chart_type === 'bar' ? (
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : content.chart_type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
          </LineChart>
        ) : content.chart_type === 'area' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name">
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        )}
      </ResponsiveContainer>
      {(content.x_label || content.y_label) && (
        <p className="text-xs text-center mt-1" style={{ color: 'var(--muted-fg)' }}>
          {content.x_label}
        </p>
      )}
    </div>
  );
}
