import React from "react";

export function NeonFlashLogo({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <img
      src="/neonflash-logo.svg"
      alt="NeonFlash Logo"
      className={className + " select-none"}
      draggable={false}
      style={{ filter: "drop-shadow(0 0 8px #00fff7)" }}
    />
  );
}
