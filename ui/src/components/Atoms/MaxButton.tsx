import { twMerge } from "tailwind-merge";

interface Props {
  maxBalance?: number;
  onChangeAmount?: (amount: number) => void;
}
export function MaxButton(props: Props) {
  if (props.maxBalance && props.onChangeAmount) {
    return (
      <button
        className={twMerge(
          "h-min",
          "w-min",
          "font-medium",
          "border-2",
          "rounded-lg",
          "text-blue-400",
          "border-blue-400",
          "py-1",
          "px-2",
        )}
        onClick={() => props.onChangeAmount(props.maxBalance)}
      >
        Max
      </button>
    );
  } else {
    return <></>;
  }
}
