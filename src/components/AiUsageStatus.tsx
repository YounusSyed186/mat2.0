import { RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type AiUsageStatusProps = {
  planName: string | null;
  used: number;
  limit: number | null;
  remaining: number | null;
  isLoading?: boolean;
  className?: string;
  onRefresh?: () => void;
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(Math.max(0, Math.round(value)));

export function AiUsageStatus({
  planName,
  used,
  limit,
  remaining,
  isLoading,
  className,
  onRefresh,
}: AiUsageStatusProps) {
  const hasFixedLimit = limit !== null && limit >= 0;
  const usagePercent = hasFixedLimit && limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = hasFixedLimit && limit > 0 && usagePercent >= 80;
  const isAtLimit = hasFixedLimit && remaining === 0;

  return (
    <div className={cn("rounded-lg border border-border/70 bg-card/95 p-3 shadow-sm", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="mr-1 h-3 w-3" />
              {planName || "AI Plan"}
            </Badge>
            <span className="text-sm font-semibold">Monthly AI usage</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFixedLimit
              ? `${formatNumber(used)} used of ${formatNumber(limit)} tokens`
              : `${formatNumber(used)} tokens used this month`}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <div
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold",
              isAtLimit
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : isNearLimit
                  ? "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300"
            )}
          >
            {hasFixedLimit ? `${formatNumber(remaining || 0)} left` : "Unlimited"}
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh AI usage"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {hasFixedLimit && (
        <Progress
          value={usagePercent}
          className={cn(
            "mt-3 h-2 bg-muted",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && !isAtLimit && "[&>div]:bg-amber-500"
          )}
        />
      )}
    </div>
  );
}
