'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  description?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  const formatValue = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatValue(value)}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 ml-4">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{trend >= 0 ? '+' : ''}{trend}%</span>
            <span className="text-gray-400 font-normal ml-1">vs last period</span>
          </div>
        </div>
      )}
    </div>
  );
}
