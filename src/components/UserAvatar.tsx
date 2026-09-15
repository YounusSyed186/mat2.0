import { useState } from "react";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: { wrapper: "h-7 w-7", text: "text-xs" },
  sm: { wrapper: "h-9 w-9", text: "text-sm" },
  md: { wrapper: "h-12 w-12", text: "text-base" },
  lg: { wrapper: "h-16 w-16", text: "text-xl" },
  xl: { wrapper: "h-24 w-24", text: "text-3xl" },
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { wrapper, text } = sizeMap[size];
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  // Optimize image URLs: for Unsplash, request a small 160px thumbnail instead of multi-megabyte 24MP raw image
  let cleanUrl = avatarUrl;
  if (cleanUrl) {
    if (cleanUrl.includes("images.unsplash.com")) {
      const base = cleanUrl.split("?")[0];
      cleanUrl = `${base}?w=160&h=160&fit=crop&auto=format&q=80`;
    } else if (cleanUrl.includes("supabase.co/storage")) {
      cleanUrl = cleanUrl.split("?")[0];
    }
  }

  if (cleanUrl && !imgError) {
    return (
      <div
        className={`${wrapper} rounded-full overflow-hidden flex-shrink-0 border border-primary/20 bg-primary/10 ${className}`}
      >
        <img
          src={cleanUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${wrapper} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-serif font-bold border border-primary/20 ${text} ${className}`}
    >
      {initial}
    </div>
  );
}
