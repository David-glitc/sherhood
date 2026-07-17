import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Robinhood Chain faucet button language — #ccff00 CTA, 10–14px radius, 8px grid. */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-[14px] bg-primary text-primary-foreground font-semibold hover:brightness-110",
        outline:
          "rounded-[4px] border-[#333333] bg-transparent text-[#9e9e9e] hover:border-primary/40 hover:text-[#e5e7eb]",
        secondary:
          "rounded-[14px] bg-[#333333] text-white font-normal hover:bg-[#3d3d3d]",
        ghost:
          "rounded-none bg-transparent text-[#e5e7eb] hover:text-primary",
        destructive:
          "rounded-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4 py-3 text-sm",
        xs: "h-7 gap-1 rounded-[6px] px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-[10px] px-3 text-sm",
        lg: "h-12 gap-2 rounded-[14px] px-8 py-4 text-base font-semibold",
        icon: "size-10 rounded-[10px]",
        "icon-xs": "size-7 rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[10px]",
        "icon-lg": "size-11 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
