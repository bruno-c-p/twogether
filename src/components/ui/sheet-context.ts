import { createContext, type ComponentProps, type ComponentType } from "react";
import type { Drawer } from "@base-ui/react/drawer";

export type SheetActions = Drawer.Root.Actions;

type ButtonProps = ComponentProps<"button">;

// Before the drawer loads, a trigger is a plain button that asks to open;
// inside the loaded drawer it is the drawer's own trigger.
export const SheetTriggerContext = createContext<
  { onOpen: () => void } | { Trigger: ComponentType<ButtonProps> }
>({ onOpen: () => undefined });

// The drawer's title, description and close parts, for headers rendered in
// its popup.
export const SheetPartsContext = createContext<{
  Title: ComponentType<ComponentProps<"h2">>;
  Description: ComponentType<ComponentProps<"p">>;
  Close: typeof Drawer.Close;
} | null>(null);
