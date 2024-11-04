import { Address } from "@solana/addresses";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { useGetTokenInfo } from "@/hooks/token";

interface Props {
  className?: string;
  tokens: Address[];
}

function TokenIconArray(props: Props) {
  const { getTokenIcon } = useGetTokenInfo();
  return (
    <div className="flex items-center -space-x-6">
      {props.tokens.slice(0, 3).map((token, i) => {
        const tokenIcon = getTokenIcon(token);

        return cloneElement(tokenIcon, {
          className: twMerge(
            tokenIcon.props.className,
            props.className,
            "border-black",
            "border",
            "rounded-full",
            "relative",
            "shrink-0",
          ),
          style: { zIndex: 3 - i },
          key: i,
        });
      })}
    </div>
  );
}

export default TokenIconArray;
