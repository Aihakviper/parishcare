import { Line, LineChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: number[]
}

export function Sparkline({ data }: SparklineProps) {
  const points = data.map((value, day) => ({ day, value }))

  return (
    <div className="h-10 w-full min-w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2D5544"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
