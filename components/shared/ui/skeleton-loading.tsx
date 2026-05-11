


// Skeleton loading component
interface SkeletonLoadingProps {
  type?: "card" | "table" | "form" | "dashboard";
  count?: number;
  className?: string;
}

export function SkeletonLoading({ type = "card", count = 1, className }: SkeletonLoadingProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="p-6 border rounded-lg space-y-3">
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );

      case "table":
        return (
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-3 p-4">
              {[...Array(count)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-1/4 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        );

      case "form":
        return (
          <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        );

      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-muted rounded animate-pulse" />
              <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
}