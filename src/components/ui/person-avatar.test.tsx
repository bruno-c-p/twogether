import { describe, expect, test } from "vitest";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { renderPlain } from "@/test/render";

describe("PersonAvatar", () => {
  test("shows the member's initial", () => {
    const { screen } = renderPlain(
      <PersonAvatar name=" ágata" position={1} title="Ágata" />,
    );

    expect(screen.getByTitle("Ágata").textContent).toBe("Á");
  });

  test.each(["👩🏽‍💻", "🇧🇷", "a\u0301"])(
    "keeps the complete first grapheme %s",
    (initial) => {
      const { screen } = renderPlain(
        <PersonAvatar
          name={`${initial} Aleksandra`}
          position={0}
          title="member"
        />,
      );

      expect(screen.getByTitle("member").textContent).toBe(
        initial.toLocaleUpperCase("pt-BR"),
      );
    },
  );

  test("falls back to ? for an unknown member or a blank name", () => {
    const { screen } = renderPlain(
      <>
        <PersonAvatar name="Ana" position={-1} title="unknown" />
        <PersonAvatar name="  " position={0} title="blank" />
      </>,
    );

    expect(screen.getByTitle("unknown").textContent).toBe("?");
    expect(screen.getByTitle("blank").textContent).toBe("?");
  });
});
