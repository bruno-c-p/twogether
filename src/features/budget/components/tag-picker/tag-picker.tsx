import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Optional } from "@/components/ui/field/field";
import styles from "@/features/budget/components/tag-picker/tag-picker.module.css";

export function TagPicker({
  tags,
  input,
  existingTags,
  onInput,
  onAdd,
  onRemove,
}: {
  tags: string[];
  input: string;
  existingTags: string[];
  onInput: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (tag: string) => void;
}) {
  const full = tags.length >= 8;
  const suggestions = existingTags.filter((tag) => !tags.includes(tag));
  return (
    <>
      <label htmlFor="tag-input">
        Tags <Optional>opcional · até 8</Optional>
      </label>
      <div className={styles.tagInputWrapper}>
        <span>#</span>
        <input
          id="tag-input"
          placeholder="Digite uma tag e pressione Enter"
          value={input}
          maxLength={24}
          disabled={full}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              onAdd(input);
            }
          }}
        />
        <Button
          type="button"
          variant="icon"
          aria-label="Adicionar tag"
          disabled={!input.trim() || full}
          onClick={() => onAdd(input)}
        >
          <Plus size={18} />
        </Button>
      </div>
      {!!tags.length && (
        <div className={styles.selectedTags}>
          {tags.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="tag"
              aria-label={`Remover tag ${tag}`}
              onClick={() => onRemove(tag)}
            >
              #{tag}
              <X size={12} />
            </Button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && !full && (
        <div className={styles.tagSuggestions}>
          <span>Sugestões</span>
          {suggestions.slice(0, 5).map((tag) => (
            <button type="button" key={tag} onClick={() => onAdd(tag)}>
              #{tag}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
