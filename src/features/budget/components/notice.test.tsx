import { act, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useNotice } from "@/features/budget/components/notice";
import { transaction } from "@/test/fixtures";
import { renderPlain } from "@/test/render";

function Probe() {
  const { notice, setNotice } = useNotice();

  return (
    <div>
      <button type="button" onClick={() => setNotice({ message: "Salvo." })}>
        plain
      </button>
      <button
        type="button"
        onClick={() => setNotice({ message: "Fica.", undo: transaction() })}
      >
        undo
      </button>
      <button
        type="button"
        onClick={() =>
          setNotice({ message: "Acerto.", undoSettle: transaction() })
        }
      >
        settle
      </button>
      {notice ? <p>{notice.message}</p> : <p>vazio</p>}
    </div>
  );
}

describe("useNotice", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("a notice without an action dismisses itself", () => {
    vi.useFakeTimers();
    const { screen } = renderPlain(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "plain" }));
    expect(screen.getByText("Salvo.")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("vazio")).toBeTruthy();
  });

  test("undo notices stay until they are replaced", () => {
    vi.useFakeTimers();
    const { screen } = renderPlain(<Probe />);

    fireEvent.click(screen.getByRole("button", { name: "undo" }));
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("Fica.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "settle" }));
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("Acerto.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "plain" }));
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("vazio")).toBeTruthy();
  });
});
