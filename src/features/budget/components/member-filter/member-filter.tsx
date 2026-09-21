import type { Member } from "@/features/budget/domain/types";
import styles from "@/features/budget/components/member-filter/member-filter.module.css";

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
  return (
    <div className={styles.personFilter} aria-label="Filtrar por pessoa">
      <button
        aria-pressed={value === "all"}
        className={value === "all" ? styles.active : ""}
        onClick={() => onChange("all")}
      >
        Nós
      </button>
      {[...members]
        .sort((a, b) => Number(b.id === userId) - Number(a.id === userId))
        .map((member) => (
          <button
            key={member.id}
            aria-pressed={value === member.id}
            className={value === member.id ? styles.active : ""}
            onClick={() => onChange(member.id)}
          >
            {member.id === userId ? "Eu" : member.name}
          </button>
        ))}
    </div>
  );
}
