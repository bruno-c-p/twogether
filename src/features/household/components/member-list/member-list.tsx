import type { Member } from "@/features/budget";
import { PersonAvatar } from "@/components/app/person-avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/glaze/ui/item";

export function MemberList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <ItemGroup variant="plain" aria-label="Membros do espaço">
      {members.map((member, index) => (
        <Item key={member.id}>
          <ItemMedia>
            <PersonAvatar
              name={member.name}
              position={index}
              className="size-8"
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{member.name}</ItemTitle>
            <ItemDescription>
              {member.id === currentUserId ? "Você" : "Seu par"}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
