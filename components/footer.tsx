"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-2">
          <img
            src="/neonflash-logo.svg"
            alt="NeonFlash Logo"
            width={28}
            height={28}
            className="drop-shadow-neon"
            style={{ filter: "drop-shadow(0 0 6px #19FB9B)" }}
          />
          <span className="font-semibold tracking-tight text-lg">
            NeonFlash
          </span>
        </div>
        <div className="text-sm text-muted-foreground text-center md:text-right">
          &copy; {new Date().getFullYear()} NeonFlash. All rights reserved.
          <br />
          <span className="inline-block mt-1">
            Built by{" "}
            <Link
              href="https://goodnessmbakara.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary font-medium"
            >
              goodnessonweb3
            </Link>{" "}
            for the{" "}
            <Link
              href="https://neonevm.org/bootcamp"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Neon EVM Bootcamp
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
