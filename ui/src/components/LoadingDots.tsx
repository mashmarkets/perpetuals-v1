import { twMerge } from "tailwind-merge";

export function LoadingDots({
  className,
  numDots = 3,
  style = "bounce",
}: {
  className?: string;
  numDots?: number;
  style?: "bounce" | "pulse";
}) {
  return (
    <div
      className={twMerge(
        className,
        "flex",
        "items-center",
        "justify-center",
        "gap-x-[0.25em]",
      )}
    >
      {Array.from({ length: numDots }).map((_, i) => (
        <div
          className={twMerge(
            style === "bounce" ? "animate-staggered-bounce" : "animate-pulse",
            "bg-current",
            "flex-shrink-0",
            "h-[0.33em]",
            "rounded-full",
            "w-[0.33em]",
          )}
          key={i}
          style={{
            animationDelay: `${i * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}
