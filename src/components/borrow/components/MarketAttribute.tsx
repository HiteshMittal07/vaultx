import { useState } from "react";
import { Info, Copy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function MarketAttribute({
  label,
  value,
  logo,
  simpleValue,
  hasInfo,
  infoText,
  href,
  onCopy,
}: any) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
      <div className="text-zinc-400 text-sm flex items-center gap-1">
        <span>{label}</span>
        {hasInfo && (
          <div
            className="relative"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <Info className="h-3 w-3 cursor-help hover:text-white transition-colors" />
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute left-0 bottom-full mb-2 w-48 z-50 p-3 rounded-xl bg-[#0A0A0A] border border-white/10 shadow-2xl text-[11px] font-normal leading-relaxed text-zinc-400 pointer-events-none"
                >
                  {infoText || "More information about this attribute."}
                  <div className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/5" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {simpleValue ? (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{value}</span>
          {onCopy && (
            <Copy
              className="h-3.5 w-3.5 text-zinc-500 cursor-pointer hover:text-white transition-colors"
              onClick={onCopy}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center">
            {logo && <Image src={logo} alt={value} width={20} height={20} />}
          </div>
          <span className="text-white text-sm font-medium">{value}</span>
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 text-zinc-500 hover:text-white transition-colors" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
