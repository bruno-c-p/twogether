import type { Member } from "@/features/budget/domain/types";
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
      {members.map((member) => (
        <div className={styles.coupleMember} key={member.id}>
          <span className={styles.avatar}>
            {member.name.slice(0, 1).toUpperCase()}
          </span>
          <strong>{member.name}</strong>
          <span>{member.id === currentUserId ? "Você" : "Seu par"}</span>
        </div>
      ))}
    </div>
  );
}
