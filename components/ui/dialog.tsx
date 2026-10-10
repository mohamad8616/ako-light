"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { motion, type MotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { useLanguage } from "@/lib/i18n/LanguageProvider"


function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-40 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  motionProps,
  onExitComplete,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  motionProps?: MotionProps
  onExitComplete?: () => void
}) {
  const { t } = useLanguage()
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          // The popup is a flex COLUMN whose own height is capped relative to
          // the viewport. It must NOT scroll itself: `overflow-y-auto` here
          // (the previous behaviour) made the header and the action row scroll
          // away with the fields, so a long form left the admin with no title
          // and no Save button. Scrolling belongs to `DialogBody` instead, which
          // is why this element is `overflow-hidden` and every direct child is
          // a flex item that either stays put (header, footer) or shrinks
          // (`min-h-0`) so the body can absorb the scroll.
          "fixed top-1/2 left-1/2 z-40 flex max-h-[90dvh] w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg sm:w-full sm:max-w-3xl",
          !motionProps &&
            "transition duration-200 ease-in-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          className
        )}
        render={
          motionProps
            ? (popupProps, state) => (
                <motion.div
                  {...(popupProps as React.ComponentProps<typeof motion.div>)}
                  initial={motionProps.initial}
                  animate={
                    state.transitionStatus === "ending"
                      ? motionProps.exit
                      : motionProps.animate
                  }
                  exit={motionProps.exit}
                  transition={motionProps.transition}
                  onAnimationComplete={() => {
                    if (state.transitionStatus === "ending") {
                      onExitComplete?.()
                    }
                  }}
                />
              )
            : undefined
        }
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                // LOGICAL `end-4`, not the physical `right-4` this used to be.
                // The header reserves room for the X with `pe-12`
                // (padding-inline-END), so the two must agree: in RTL the inline
                // end is the LEFT edge, and a physical `right-4` put the button
                // on the START side — directly on top of the title, with the
                // reserved padding stranded on the other side.
                className="absolute top-4 end-4"
                size="icon-sm"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">{t("nav.close")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      // `shrink-0` keeps the title in place while the body scrolls beneath it.
      // The close button is absolutely positioned inside the popup, so the
      // header's end padding reserves room for it and a long title can never
      // run underneath the X.
      className={cn("flex shrink-0 flex-col gap-1.5 p-6 pe-12", className)}
      {...props}
    />
  )
}

/**
 * The scrolling region of a dialog.
 *
 * Everything that can grow without bound (a long form, a media grid, a list)
 * belongs in here. `min-h-0` is what actually lets the body shrink: a flex item
 * defaults to `min-height: auto`, which would make the column grow past the
 * popup's cap instead of scrolling. `overscroll-contain` stops a wheel gesture
 * at the end of the content from chaining to the page behind the modal — that
 * chaining is exactly what made the underlying page scroll while the dialog was
 * open.
 *
 * Padding is deliberately NOT applied here. Dialogs whose content is a plain
 * stack of fields only need the region itself; the admin dialogs add the shared
 * `px-6 pb-6` inset on the form they put inside it, and full-bleed dialogs (the
 * public product modal) lay their own grid out to the edges.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className
      )}
      {...props}
    />
  )
}

/**
 * The action row of a dialog.
 *
 * `shrink-0` + `mt-auto` pin it to the bottom of the popup's flex column, so
 * Save/Cancel stay reachable no matter how tall the body grows. Callers pass
 * their own alignment/padding classes.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-sm font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
