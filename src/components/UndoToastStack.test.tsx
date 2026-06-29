import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UndoToastStack } from "./UndoToastStack";

describe("UndoToastStack", () => {
  it("renders multiple stacked toasts with independent undo actions", async () => {
    const onUndoFirst = vi.fn().mockResolvedValue(undefined);
    const onUndoSecond = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <UndoToastStack
        toasts={[
          { id: "1", message: "Item deleted", onUndo: onUndoFirst },
          { id: "2", message: "Item moved to Shopping", onUndo: onUndoSecond },
        ]}
        durationMs={10_000}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Item deleted")).toBeInTheDocument();
    expect(screen.getByText("Item moved to Shopping")).toBeInTheDocument();

    const undoButtons = screen.getAllByRole("button", { name: "Undo" });
    await user.click(undoButtons[0]);

    expect(onUndoFirst).toHaveBeenCalledOnce();
    expect(onUndoSecond).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith("1");
  });
});
