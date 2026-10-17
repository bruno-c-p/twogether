import type { Member } from "@/features/budget";
import { PersonAvatar } from "@/components/ui/person-avatar";
import styles from "@/features/household/components/member-list/member-list.module.css";

export function MemberList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <div className={styles.coupleMembers}>
      {members.map((member, index) => (
        <div className={styles.coupleMember} key={member.id}>
          <PersonAvatar
            name={member.name}
            position={index}
            className="w-[34px] h-[34px] text-xs"
          />
          <strong>{member.name}</strong>
          <span>{member.id === currentUserId ? "Você" : "Seu par"}</span>
        </div>
      ))}
    </div>
  );
}
