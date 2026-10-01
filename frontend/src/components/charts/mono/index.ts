/**
 * Mono Charts — set premium de gráficos data-driven (monocromático violeta),
 * inspirado en amicro/mono-charts. Construido sobre Recharts + Framer Motion.
 *
 * Uso típico (API estilo Tremor):
 *   <ChartFrame title="Ventas" index={0}>
 *     <MonoAreaChart data={data} index="date" categories={['total']}
 *       valueFormatter={(v)=>fmtMoney(v)} />
 *   </ChartFrame>
 */
export { default as ChartFrame } from './ChartFrame';
export { default as MonoTooltip } from './MonoTooltip';
export { default as MonoAreaChart } from './MonoAreaChart';
export { default as MonoBarChart } from './MonoBarChart';
export { default as MonoLineChart } from './MonoLineChart';
export { default as MonoDonutChart } from './MonoDonutChart';
export { default as MonoGauge } from './MonoGauge';
export { default as MonoSparkline } from './MonoSparkline';
export * from './tokens';
