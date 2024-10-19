import { PublicKey } from "@solana/web3.js";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { getTokenIcon, getTokenPublicKey, TokenE } from "@/lib/Token";

interface Props {
  className?: string;
  tokens: TokenE[] | PublicKey[];
}

export function PoolTokens(props: Props) {
  return (
    <div className="flex items-center -space-x-6">
      {props.tokens.slice(0, 3).map((token, i) => {
        const tokenIcon = getTokenIcon(
          token instanceof PublicKey ? token : getTokenPublicKey(token),
        );

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
