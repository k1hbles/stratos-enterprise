"use client";

import { type HTMLAttributes, type ReactElement, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "size-8 text-[var(--text-sm)]",
  md: "size-10 text-[var(--text-base)]",
  lg: "size-14 text-[var(--text-lg)]",
};

const imageSize: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
}

export function Avatar({
  className,
  name,
  src,
  alt,
  size = "md",
  ...props
}: AvatarProps): ReactElement {
  const [hasImageError, setHasImageError] = useState(false);

  const initials = useMemo<string>(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "?";
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [name]);

  const shouldRenderImage = Boolean(src) && !hasImageError;
  const imageSource = src ?? "";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-default)] bg-[var(--glass-bg)] font-semibold text-[var(--text-primary)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-label={alt ?? `${name}'s avatar`}
      {...props}
    >
      {shouldRenderImage ? (
        <Image
          src={imageSource}
          alt={alt ?? `${name}'s avatar`}
          width={imageSize[size]}
          height={imageSize[size]}
          className="size-full object-cover"
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  );
}
