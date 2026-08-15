"use client";

/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type { ComponentChildren, JSX, RefObject } from "preact";
import { useCallback, useEffect, useRef } from "preact/hooks";

import { AFTER_NAVIGATE_EVENT } from "@takazudo/zudo-doc/transitions";

export type PreviewEnlargeDialogProps = {
  readonly children: ComponentChildren;
  readonly isOpen: boolean;
  readonly labelId: string;
  readonly onClose: () => void;
  readonly returnFocusRef: RefObject<HTMLElement>;
  readonly title: string;
  readonly variant: "footprint" | "model";
};

/**
 * Centre the modal with `inset: 0; margin: auto` rather than a transform.
 *
 * A `transform` on the dialog would establish a containing block for its
 * `position: fixed` descendants, which would trap `.zld-preview-dialog__close`
 * at the dialog's corner instead of the viewport's. Same constraint, and same
 * value, as the package-owned image-enlarge dialog in `@takazudo/zudo-doc`.
 */
const ENLARGE_DIALOG_STYLE = {
  position: "fixed",
  inset: "0",
  margin: "auto",
} as const;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';

/**
 * Shared native-dialog chrome for the controlled component preview adapters —
 * one dialog implementation behind both the footprint image and the 3D model
 * viewer.
 *
 * ## Hand-rolled, not ported
 *
 * led-lamp's version is a thin wrapper over `useModalDialog` /
 * `ENLARGE_DIALOG_STYLE` from `@takazudo/zudo-doc`. Neither subpath exists at
 * the `^0.2.9` installed here (`use-modal-dialog` and `island-types` are absent
 * from `node_modules/@takazudo/zudo-doc/dist/`), so the open/close, focus and
 * backdrop behaviour is implemented directly against the native `<dialog>`
 * element below.
 *
 * `AFTER_NAVIGATE_EVENT` — the third import led-lamp takes — *does* exist at
 * 0.2.9 (`@takazudo/zudo-doc/transitions`, value `"zfb:after-swap"`, dispatched
 * on `document` by `@takazudo/zfb-runtime`'s client router), so SPA soft-swap
 * navigation closes this dialog exactly as it does in led-lamp. It is listened
 * to by name rather than through the package's `onAfterNavigate()` helper so
 * the listener can share one effect with the dialog's own `close` handler.
 */
export function PreviewEnlargeDialog({
  children,
  isOpen,
  labelId,
  onClose,
  returnFocusRef,
  title,
  variant,
}: PreviewEnlargeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Read inside listeners that are registered once, so a re-rendered parent
  // never leaves a stale `onClose` bound to the dialog.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const handleClose = () => onCloseRef.current();
    // The SPA router replaces the page body under an open dialog; without this
    // the dialog would survive the swap in the top layer, over content it no
    // longer belongs to.
    const handleAfterNavigate = () => {
      if (dialog.open) dialog.close();
      else onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);
    document.addEventListener(AFTER_NAVIGATE_EVENT, handleAfterNavigate);
    return () => {
      dialog.removeEventListener("close", handleClose);
      document.removeEventListener(AFTER_NAVIGATE_EVENT, handleAfterNavigate);
    };
  }, []);

  // Whether the previous commit had this dialog open. Focus is only returned
  // on an open -> closed transition; without this the closed dialog every
  // record page renders would steal focus to its trigger on first mount.
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      // Focus the close control rather than the dialog: the first thing a
      // keyboard reader lands on should be the way out.
      dialog.querySelector<HTMLElement>(".zld-preview-dialog__close")?.focus();
      wasOpenRef.current = true;
      return;
    }
    if (dialog.open) dialog.close();
    if (wasOpenRef.current) {
      // The native `close` event can be dispatched before this effect runs, so
      // focus is restored here rather than in the close listener — this covers
      // every close path (Escape, backdrop, close button, SPA navigation).
      returnFocusRef.current?.focus();
    }
    wasOpenRef.current = false;
  }, [isOpen, returnFocusRef]);

  const handleBackdropClick = useCallback((event: JSX.TargetedMouseEvent<HTMLDialogElement>) => {
    const dialog = event.currentTarget;
    // A click on the ::backdrop is reported with the dialog as its target, so
    // "outside" is decided by the pointer position against the dialog box.
    // A keyboard-activated click reports 0,0 with no real coordinates, which
    // `detail === 0` distinguishes from a genuine pointer press.
    if (event.detail === 0) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dialog.close();
    }
  }, []);

  const handleKeyDown = useCallback((event: JSX.TargetedKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    // A native modal dialog already confines Tab to the top layer; this adds
    // the wrap-around at each end so focus never parks on the dialog box
    // itself between the last and first control.
    const dialog = event.currentTarget;
    const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
      .filter((element) => element.getClientRects().length > 0);
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
      dialog.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`zld-preview-dialog zld-preview-dialog--${variant}`}
      style={ENLARGE_DIALOG_STYLE}
      aria-labelledby={labelId}
      data-component-preview-dialog={variant}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="zld-preview-dialog__close"
        aria-label={`Close enlarged ${variant} preview`}
        onClick={() => dialogRef.current?.close()}
      >
        <svg
          className="zld-preview-dialog__close-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
      <h2 id={labelId} className="zld-preview-dialog__title">{title}</h2>
      <div className="zld-preview-dialog__content">
        {children}
      </div>
    </dialog>
  );
}
