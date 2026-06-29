import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleTranscribeRequest } from "./server/transcribe-api";
import { handleRecordingAudioRequest } from "./server/recording-audio-api";

function transcribeApiPlugin(): Plugin {
  return {
    name: "pebble-ring-transcribe-api",
    configureServer(server) {
      server.middlewares.use("/api/transcribe", (req, res) => {
        void handleTranscribeRequest(req, res);
      });
      server.middlewares.use("/api/recording-audio", (req, res) => {
        void handleRecordingAudioRequest(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/transcribe", (req, res) => {
        void handleTranscribeRequest(req, res);
      });
      server.middlewares.use("/api/recording-audio", (req, res) => {
        void handleRecordingAudioRequest(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.ASSEMBLYAI_API_KEY ??= env.ASSEMBLYAI_API_KEY;

  return {
    plugins: [react(), transcribeApiPlugin()],
    server: {
      port: 5174,
    },
  };
});
