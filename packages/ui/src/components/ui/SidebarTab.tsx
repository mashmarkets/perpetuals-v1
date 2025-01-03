import { twMerge } from "tailwind-merge";

interface Props {
  className?: string;
  children: React.ReactNode;
  selected?: boolean;
  onClick?(): void;
}

export function SidebarTab(props: Props) {
  return (
    <button
      className={twMerge(
        "fill-gray-400",
        "font-bold",
        "text-gray-200",
        "text-sm",
        "bg-black",
        "flex",
        "h-9",
        "items-center",
        "justify-center",
        "rounded",
        "space-x-2.5",
        "transition-colors",
        !props.selected && "hover:bg-white/20",
        props.selected && "bg-emerald-400",
        props.selected && "font-bold",
        props.selected && "text-black",
        props.className,
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
export enum Tab {
  Add,
  Remove,
}
