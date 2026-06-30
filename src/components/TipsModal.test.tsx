import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TipsModal } from "./TipsModal";
import { renderWithProviders } from "../test/test-utils";

describe("TipsModal", () => {
  it("shows tips and closes", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<TipsModal open onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Tips" })).toBeInTheDocument();
    expect(screen.getByText(/Hold ⌘ while clicking the trash icon/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
