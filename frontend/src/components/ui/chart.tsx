import * as React from 'react'
import { cn } from '@/utils/cn'

export type ChartConfig = Record<string, { label: string; color?: string }>

export function ChartContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('w-full h-full', className)}>{children}</div>
}

export function ChartTooltip({ content }: { content: React.ReactNode }) {
  return <>{content}</>
}

export function ChartLegend({ children }: { children?: React.ReactNode }) {
  return <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">{children}</div>
}

export function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 shadow-md dark:shadow-none text-xs">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}
