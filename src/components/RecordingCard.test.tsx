import { DndContext } from "@dnd-kit/core";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordingCard } from "./RecordingCard";
import { mockGetIdToken, renderWithProviders } from "../test/test-utils";
import type { ParsedList } from "../types/list";
import type { ParsedRecording } from "../types/recording";

vi.mock("./RecordingAudioPlayer", () => ({
  RecordingAudioPlayer: () => <div data-testid="audio-player" />,
}));

const recording: ParsedRecording = {
  id: "rec-1",
  timestampMs: 1_700_000_000_000,
  updatedMs: 1_700_000_000_000,
  title: "Test recording",
  transcription: "Hello from Pebble",
  autoTranscription: "Hello from Pebble",
  userTranscription: "",
  fileName: "clip.m4a",
  status: "completed",
  transcribedUsingModel: "universal-2",
  raw: {
    timestamp: 1_700_000_000_000,
    updated: 1_700_000_000_000,
    entries: [],
    assistant_session: null,
    metadata: null,
    encrypted: null,
  },
};

const shoppingList: ParsedList = {
  id: "list-shopping",
  title: "Shopping",
  icon: "🛒",
  listKind: "note",
  seed: null,
  deleted: false,
  createdAt: 0,
  updatedAt: 0,
};

function renderCard(overrides: Partial<Parameters<typeof RecordingCard>[0]> = {}) {
  const props = {
    uid: "user-1",
    recording,
    listChips: [shoppingList],
    availableLists: [] as ParsedList[],
    busy: false,
    getIdToken: mockGetIdToken,
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onRetranscribe: vi.fn(),
    onAddToList: vi.fn(),
    onRemoveFromList: vi.fn(),
    onNewList: vi.fn(),
    onShowJson: vi.fn(),
    onUpdateTranscription: vi.fn(),
    ...overrides,
  };

  return renderWithProviders(
    <DndContext>
      <RecordingCard {...props} />
    </DndContext>,
  );
}

describe("RecordingCard", () => {
  it("renders transcription and list chips", () => {
    renderCard();

    expect(screen.getByText("Hello from Pebble")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🛒 Shopping" })).toBeInTheDocument();
  });

  it("passes the click event to onDelete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onDelete });

    await user.click(screen.getByTitle("Delete"));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete.mock.calls[0][0].metaKey).toBe(false);
  });

  it("passes metaKey on cmd-click delete", () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });

    fireEvent.click(screen.getByTitle("Delete"), { metaKey: true });

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete.mock.calls[0][0].metaKey).toBe(true);
  });

  it("opens card menu and shows JSON", async () => {
    const onShowJson = vi.fn();
    const user = userEvent.setup();
    renderCard({ onShowJson });

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: "Show JSON" }));

    expect(onShowJson).toHaveBeenCalledOnce();
  });

  it("disables actions while busy", () => {
    renderCard({ busy: true });

    expect(screen.getByTitle("Delete")).toBeDisabled();
    expect(screen.getByTitle("Archive")).toBeDisabled();
  });

  it("opens new list prompt from the add-to-list menu", async () => {
    const onNewList = vi.fn();
    const user = userEvent.setup();
    renderCard({ onNewList, availableLists: [shoppingList] });

    await user.click(screen.getByLabelText("Add to list"));
    await user.click(screen.getByRole("menuitem", { name: "New list" }));

    expect(onNewList).toHaveBeenCalledOnce();
  });

  it("retranscribes from the card menu", async () => {
    const onRetranscribe = vi.fn();
    const user = userEvent.setup();
    renderCard({ onRetranscribe });

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(
      screen.getByRole("menuitem", {
        name: /Audio transcribed with universal-2 — Retranscribe with universal-2/,
      }),
    );

    expect(onRetranscribe).toHaveBeenCalledOnce();
  });
});
