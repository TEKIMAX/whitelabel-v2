import { internalQuery } from "./_generated/server";

export const checkEnv = internalQuery({
    args: {},
    handler: async (ctx) => {
        return {
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || "UNDEFINED",
            hasWorkOSKey: !!process.env.WORKOS_API_KEY,
        };
    },
});
