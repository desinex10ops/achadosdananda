import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  iconBg = "bg-rose-50",
  iconColor = "text-rose-600",
  description,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg, iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-rose-600",
              trend === "neutral" && "text-slate-500"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
