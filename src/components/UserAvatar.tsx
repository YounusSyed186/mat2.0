import { useState } from "react";
import { Lock } from "lucide-react";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  blurred?: boolean;
}

const sizeMap = {
  xs: { wrapper: "h-7 w-7", text: "text-xs", icon: "h-2.5 w-2.5" },
  sm: { wrapper: "h-9 w-9", text: "text-sm", icon: "h-3 w-3" },
  md: { wrapper: "h-12 w-12", text: "text-base", icon: "h-3.5 w-3.5" },
  lg: { wrapper: "h-16 w-16", text: "text-xl", icon: "h-4 w-4" },
  xl: { wrapper: "h-24 w-24", text: "text-3xl", icon: "h-6 w-6" },
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "", blurred = false }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { wrapper, text, icon } = sizeMap[size];
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
        className={`${wrapper} relative rounded-full overflow-hidden flex-shrink-0 border border-primary/20 bg-primary/10 ${className}`}
      >
        <img
          src={cleanUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-all ${
            blurred ? "filter blur-[8px] scale-110 pointer-events-none select-none brightness-95" : ""
          }`}
          onError={() => setImgError(true)}
        />
        {blurred && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
            <Lock className={`${icon} text-white drop-shadow-md`} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${wrapper} relative rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-serif font-bold border border-primary/20 ${text} ${className}`}
    >
      <span className={blurred ? "filter blur-sm select-none" : ""}>{initial}</span>
      {blurred && (
        <div className="absolute inset-0 rounded-full bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
          <Lock className={`${icon} text-white drop-shadow-md`} />
        </div>
      )}
    </div>
  );
}
