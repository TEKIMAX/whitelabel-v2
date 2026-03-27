import { defineApp } from "convex/server";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import prosemirrorSync from "@convex-dev/prosemirror-sync/convex.config";
import adaptiveLearning from "./adaptive_learning/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import convexFilesControl from "@gilhrpenner/convex-files-control/convex.config";
import selfHosting from "@convex-dev/static-hosting/convex.config.js";
// import openResponse from "./open_response/convex.config";

const app = defineApp();
app.use(workOSAuthKit, { name: "workOSAuthKit" });
app.use(stripe);
app.use(workflow);
app.use(prosemirrorSync);
app.use(adaptiveLearning);
app.use(convexFilesControl);
app.use(selfHosting);
// app.use(openResponse, { name: "openResponse" });


export default app;
