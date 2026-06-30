export type Tip = {
  id: string;
  text: string;
};

export const APP_TIPS: Tip[] = [
  {
    id: "delete-skip-confirm",
    text: "Hold ⌘ while clicking the trash icon to delete a recording without a confirmation prompt.",
  },
];
