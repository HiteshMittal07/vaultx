"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component for loading states.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/50",
        className
      )}
    />
  );
}

/**
 * Text skeleton with common text heights.
 */
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

export function TextSkeleton({
  lines = 1,
  className,
  lineClassName,
}: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
            lineClassName
          )}
        />
      ))}
    </div>
  );
}

/**
 * Metric skeleton for dashboard stats.
 */
interface MetricSkeletonProps {
  showSubValue?: boolean;
  className?: string;
}

export function MetricSkeleton({
  showSubValue = false,
  className,
}: MetricSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-3 w-24" /> {/* Label */}
      <Skeleton className="h-8 w-32" /> {/* Value */}
      {showSubValue && <Skeleton className="h-3 w-20" />} {/* Sub value */}
    </div>
  );
}

/**
 * Card skeleton for content blocks.
 */
interface CardSkeletonProps {
  className?: string;
  hasHeader?: boolean;
  lines?: number;
}

export function CardSkeleton({
  className,
  hasHeader = true,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-zinc-900/50 p-6 space-y-4",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
      <TextSkeleton lines={lines} />
    </div>
  );
}

/**
 * Token input skeleton.
 */
export function TokenInputSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-3xl bg-white/[0.03] p-5 space-y-4", className)}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-16" /> {/* Label */}
        <Skeleton className="h-3 w-24" /> {/* Balance */}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" /> {/* Input */}
        <Skeleton className="h-10 w-28 rounded-2xl" /> {/* Token selector */}
      </div>
    </div>
  );
}

/**
 * Table row skeleton.
 */
interface TableRowSkeletonProps {
  columns?: number;
  className?: string;
}

export function TableRowSkeleton({
  columns = 4,
  className,
}: TableRowSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 py-4 border-b border-white/5",
        className
      )}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-32" : i === columns - 1 ? "w-16" : "w-24"
          )}
        />
      ))}
    </div>
  );
}

/**
 * List skeleton for multiple items.
 */
interface ListSkeletonProps {
  items?: number;
  className?: string;
  itemClassName?: string;
}

export function ListSkeleton({
  items = 3,
  className,
  itemClassName,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn("flex items-center gap-3", itemClassName)}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Button skeleton.
 */
interface ButtonSkeletonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ButtonSkeleton({
  className,
  size = "md",
}: ButtonSkeletonProps) {
  const sizeClasses = {
    sm: "h-8 w-20",
    md: "h-10 w-28",
    lg: "h-12 w-full",
  };

  return (
    <Skeleton
      className={cn("rounded-xl", sizeClasses[size], className)}
    />
  );
}

/**
 * Avatar skeleton.
 */
interface AvatarSkeletonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarSkeleton({
  size = "md",
  className,
}: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <Skeleton
      className={cn("rounded-full", sizeClasses[size], className)}
    />
  );
}
