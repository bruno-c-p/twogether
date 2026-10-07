import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

export function Switch({
  className,
  ...props
}: Omit<BaseSwitch.Root.Props, "className"> & { className?: string }) {
  return (
    <BaseSwitch.Root
      nativeButton
      render={<Button variant="unstyled" />}
      className={cx(
        "shrink-0 w-[38px] h-[22px] rounded-full relative cursor-pointer m-0",
        "border border-solid border-border bg-surface",
        "data-[checked]:bg-accent data-[checked]:border-accent",
        "data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cx(
          "absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-text-muted",
          "transition-transform duration-150 motion-reduce:transition-none",
          "data-[checked]:translate-x-[16px] data-[checked]:bg-on-brand",
        )}
      />
    </BaseSwitch.Root>
  );
}
