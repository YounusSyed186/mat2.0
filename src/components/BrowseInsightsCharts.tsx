import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TrendPoint = {
  month: string;
  profiles: number;
};

type SignalPoint = {
  name: string;
  value: number;
};

interface BrowseInsightsChartsProps {
  trendData: TrendPoint[];
  signalData: SignalPoint[];
}

export default function BrowseInsightsCharts({ trendData, signalData }: BrowseInsightsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Monthly Activity</CardTitle>
          <CardDescription>New profile registrations trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="profiles"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Match Signals</CardTitle>
          <CardDescription>Compatibility breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <BarChart data={signalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
