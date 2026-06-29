/**
 * Optional retranscription via AssemblyAI.
 *
 * To remove this feature:
 * 1. Delete the `src/retranscribe/` folder
 * 2. Delete `server/transcribe-api.ts` and remove the plugin from `vite.config.ts`
 * 3. Remove the model-tag retranscribe menu from `RecordingCard.tsx`
 * 4. Uninstall `assemblyai` and remove `ASSEMBLYAI_API_KEY` from `.env`
 */

export { retranscribeRecording } from "./retranscribe";
export type { RetranscribeResult, RetranscribeError } from "./types";
