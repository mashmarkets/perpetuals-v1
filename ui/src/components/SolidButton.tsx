import { forwardRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { LoadingSpinner } from "@/components/Atoms/LoadingSpinner";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
}

export const SolidButton = forwardRef<HTMLButtonElement, Props>(
  function SolidButton(props, ref) {
    const { ...rest } = props;
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: any) => {
      setLoading(true);
      try {
        await rest.onClick?.(e);
      } catch (error) {
        console.error("ButtonWithLoading onClick error:", error);
      }
      setLoading(false);
    };

    return (
      <button
        {...rest}
        ref={ref}
        className={twMerge(
          "flex",
          "group",
          "h-14",
          "items-center",
          "justify-center",
          "p-3",
          "relative",
          "rounded",
          "text-white",
          "tracking-normal",
          "transition-colors",
          "bg-zinc-900",
          rest.className,
          // !loading && "active:bg-blue-400",
          "disabled:bg-zinc-900",
          "disabled:cursor-not-allowed",
          // !loading && "hover:bg-blue-400",
          loading && "cursor-not-allowed",
        )}
        onClick={(e) => {
          handleClick(e);
        }}
      >
        <div
          className={twMerge(
            "flex",
            "items-center",
            "justify-center",
            "text-current",
            "text-sm",
            "transition-all",
            "group-disabled:text-neutral-400",
            loading ? "opacity-0" : "opacity-100",
          )}
        >
          {rest.children}
        </div>
        {loading && <LoadingSpinner className="absolute text-4xl" />}
      </button>
    );
  },
);
