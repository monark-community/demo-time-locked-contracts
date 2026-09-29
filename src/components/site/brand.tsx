import Image from "next/image"
import Link from "next/link"

/**
 * The product brand (guidelines §2): butterfly mark 28px, 10px gap, product
 * name in Nunito Sans 800 18px on one line. No "by Monark" here; that credit
 * lives in the footer's Monark band.
 */
export function Brand({ href, product, label }: { href: string; product: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 pr-1">
      <Image src="/brand/monark-mark.svg" alt="" width={28} height={28} unoptimized priority className="size-7" />
      <span className="text-lg leading-none font-extrabold tracking-[-0.02em] text-foreground">{product}</span>
    </Link>
  )
}
