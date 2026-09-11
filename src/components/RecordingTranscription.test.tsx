import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordingTranscription } from "./RecordingTranscription";
import { renderWithProviders } from "../test/test-utils";

describe("RecordingTranscription", () => {
  it("enters edit mode on click and saves on blur", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <RecordingTranscription transcription="Hello world" busy={false} onSave={onSave} />,
    );

    const editor = screen.getByRole("textbox", { name: "Transcription" });
    await user.click(editor);
    await user.clear(editor);
    await user.type(editor, "Hello Pebble");
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("Hello Pebble");
  });

  it("does not save unchanged text", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <RecordingTranscription transcription="Hello world" busy={false} onSave={onSave} />,
    );

    await user.click(screen.getByRole("textbox", { name: "Transcription" }));
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("erases the user edit when cleared, revealing the auto transcription", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <RecordingTranscription
        transcription="My correction"
        autoTranscription="Auto transcription"
        busy={false}
        onSave={onSave}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Transcription" });
    await user.click(editor);
    await user.clear(editor);
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("");
    expect(editor).toHaveTextContent("Auto transcription");
  });

  it("reverts instead of erasing when there is no auto transcription to reveal", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <RecordingTranscription transcription="Only text" busy={false} onSave={onSave} />,
    );

    const editor = screen.getByRole("textbox", { name: "Transcription" });
    await user.click(editor);
    await user.clear(editor);
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
    expect(editor).toHaveTextContent("Only text");
  });
});
