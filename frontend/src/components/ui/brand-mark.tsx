import { cn } from "@/lib/utils";

const LOGO_SRC = "/images/logoruangtemu.png";

export function BrandMark({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-2xl bg-transparent", className)} aria-hidden="true">
      <span
        className={cn("absolute inset-0 bg-[url('/images/logoruangtemu.png')] bg-[length:250%_250%] bg-[position:50%_24%] bg-no-repeat", iconClassName)}
      />
    </span>
  );
}

export function BrandLogo({ className, imageClassName }: { className?: string; imageClassName?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent", className)} aria-label="RuangTemu">
      <img
        src={LOGO_SRC}
        alt="RuangTemu"
        className={cn("h-full w-full object-contain", imageClassName)}
        draggable={false}
      />
    </span>
  );
}
