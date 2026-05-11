type LoadingSkeletonProps = {
  lines?: number;
  className?: string;
};

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={`rounded-md border border-line bg-white p-4 shadow-widget ${className ?? ""}`.trim()} aria-hidden="true">
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`h-3 rounded bg-rowAlt ${index === 0 ? "w-2/3" : index === lines - 1 ? "w-1/2" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}
