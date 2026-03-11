import Image from "next/image";
import { packConfig } from "@/lib/pack-config";

export function PackFooter({ pack }: { pack?: string }) {
  if (!pack) return null;
  const config = packConfig[pack] ?? { label: pack };
  return (
    <div className="absolute left-3 bottom-3 right-3 flex items-center gap-1.5">
      <div className="relative shrink-0 w-[24px] h-[24px]">
        <Image src="/images/pack-icon.svg" alt="" width={24} height={24} />
        {config.badgeText && (
          <span className={`absolute bottom-[9px] right-[5px] text-[11px] font-bold text-black leading-none rotate-10 ${config.badgeTextClass ?? ""}`}>
            {config.badgeText}
          </span>
        )}
        {config.badgeImg && (
          <Image src={config.badgeImg} alt="" width={24} height={24} className={`absolute ${config.badgeImgClass ?? "w-[11px] h-[11px] bottom-[8px] right-[2px]"}`} />
        )}
        {config.badgeClass && !config.badgeText && !config.badgeImg && (
          <span className={`absolute bottom-[11px] right-[5px] w-[6px] h-[6px] ${config.badgeClass}`} />
        )}
      </div>
      <span className="text-[9px] text-zinc-400 truncate leading-none mb-1">{config.label}</span>
    </div>
  );
}
