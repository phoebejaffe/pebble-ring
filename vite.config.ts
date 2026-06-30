import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { handleTranscribeRequest } from "./server/transcribe-api";
import {
  handleRecordingAudioRequest,
  handleRecordingAudioResolveRequest,
} from "./server/recording-audio-api";

function registerApiRoutes(middlewares: ViteDevServer["middlewares"]) {
  middlewares.use("/api/transcribe", (req, res) => {
    void handleTranscribeRequest(req, res);
  });
  middlewares.use("/api/recording-audio-resolve", (req, res) => {
    void handleRecordingAudioResolveRequest(req, res);
  });
  middlewares.use("/api/recording-audio", (req, res) => {
    void handleRecordingAudioRequest(req, res);
  });
}

function transcribeApiPlugin(): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    registerApiRoutes(server.middlewares);
  };

  return {
    name: "pebble-ring-transcribe-api",
    configureServer: attach,
    configurePreviewServer: attach,
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
