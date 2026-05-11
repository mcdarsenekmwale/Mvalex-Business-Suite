// components/admin/analytics/AnalyticsLoadingState.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Alternative: Animated loading state with shimmer effect
export function LoadingShimmer() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/30 rounded-xl p-6 space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="flex justify-between items-center">
              <div className="h-8 w-16 bg-muted rounded" />
              <div className="h-12 w-12 bg-muted rounded-full" />
            </div>
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Large Chart */}
      <div className="bg-muted/30 rounded-xl p-6">
        <div className="space-y-2 mb-4">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
        <div className="h-[300px] bg-muted rounded-lg" />
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="space-y-2 mb-4">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted rounded" />
          </div>
          <div className="h-[250px] bg-muted rounded-lg" />
        </div>
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="space-y-2 mb-4">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted rounded" />
          </div>
          <div className="h-[250px] bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for charts only
export function GraphSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}