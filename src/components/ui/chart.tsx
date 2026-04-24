'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '../../lib/utils'

const THEMES = {
  light: '',
  dark: '.dark',
} as const

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-sector]:outline-none',
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.theme || item.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color

    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentProps<
  typeof RechartsPrimitive.Tooltip
> & {
  hideLabel?: boolean
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(({ active, payload, hideLabel = false }, ref) => {
  const { config } = useChart()

  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div
      ref={ref}
      className="grid min-w-[10rem] gap-2 rounded-lg border bg-background px-3 py-2 text-xs shadow-lg"
    >
      {payload.map((item) => {
        const dataKey = String(item.dataKey)
        const dataConfig = config[dataKey]
        const label = dataConfig.label ?? item.name

        return (
          <div
            key={dataKey}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color ?? `var(--color-${dataKey})`,
                }}
              />
              <span>{label}</span>
            </div>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        )
      })}
      {!hideLabel && payload[0].payload?.month ? (
        <div className="text-[11px] text-muted-foreground">
          Bulan: {payload[0].payload.month}
        </div>
      ) : null}
    </div>
  )
})
ChartTooltipContent.displayName = 'ChartTooltipContent'

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({ payload }: RechartsPrimitive.LegendProps) {
  const { config } = useChart()

  if (!payload.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      {payload.map((item) => {
        const dataKey = String(item.dataKey)
        const dataConfig = config[dataKey]

        return (
          <div key={dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{
                backgroundColor: item.color ?? `var(--color-${dataKey})`,
              }}
            />
            <span className="text-muted-foreground">
              {dataConfig.label ?? item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
}
