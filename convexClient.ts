/// <reference types="vite/client" />
import { ConvexReactClient } from "convex/react";

// Enable verbose logging for auth debugging
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "https://hidden-gecko-710.convex.cloud");
