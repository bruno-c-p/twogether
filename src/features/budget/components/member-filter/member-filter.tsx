import { useRef } from "react";
import type { Popover as BasePopover } from "@base-ui/react/popover";
import { ChevronDown, Icon } from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/glaze/ui/popover";
import {
  RadioGroup,
  RadioGroupOption,
} from "@/components/glaze/ui/radio-group";
import type { Member } from "@/features/budget/domain/types";

export function MemberFilter({
  members,
  userId,
  value,
  onChange,
}: {
  members: Member[];
  userId: string;
  value: string;
  onChange: (memberId: string) => void;
}) {
  const popover = useRef<BasePopover.Root.Actions>(null);

  const options = [
    { id: "all", label: "Nós" },
    ...[...members]
      .sort((a, b) => Number(b.id === userId) - Number(a.id === userId))
      .map((member) => ({
        id: member.id,
        label: member.id === userId ? "Eu" : member.name,
      })),
  ];

  const current = options.find((option) => option.id === value) ?? options[0];

  return (
    <Popover actionsRef={popover}>
      <PopoverTrigger
        render={<Button variant="secondary" size="sm" />}
        aria-label={`Filtrar por pessoa: ${current.label}`}
      >
        <span className="truncate max-w-34">{current.label}</span>
        <Icon icon={ChevronDown} />
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Filtrar por pessoa</PopoverTitle>
        </PopoverHeader>
        <RadioGroup
          value={current.id}
          aria-label="Pessoa"
          onValueChange={(next) => {
            onChange(String(next));
            popover.current?.close();
          }}
        >
          {options.map((option) => (
            <RadioGroupOption
              key={option.id}
              value={option.id}
              label={option.label}
              onClick={() => {
                if (option.id === current.id) popover.current?.close();
              }}
            />
          ))}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  );
}
