"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
};

const CLOSED: ConfirmState = {
  open: false,
  resolve: null,
  title: "",
};

/**
 * Reusable themed confirmation dialog built on Base UI Dialog.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   // ...
 *   if (await confirm({ title: "Delete?", destructive: true })) { ... }
 *   // render once:
 *   return <>{dialog}{ ... }</>;
 */
export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState>(CLOSED);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const settle = React.useCallback(
    (value: boolean) => {
      state.resolve?.(value);
      setState((prev) => ({ ...prev, open: false, resolve: null }));
    },
    [state],
  );

  const dialog = (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        // Any dismissal (esc / backdrop / close button) resolves false.
        if (!open) settle(false);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description && (
            <DialogDescription>{state.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={state.destructive ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {state.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
