// WORKOS_CLIENT_ID must be set in the Convex environment — no fallback.
// For provisioned apps this is set to the tenant WorkOS client ID by the worker.
const clientId = process.env.WORKOS_CLIENT_ID;
if (!clientId) throw new Error("WORKOS_CLIENT_ID is not set in Convex environment");

const authConfig = {
    providers: [
        // Standard WorkOS Domains
        {
            type: "customJwt",
            issuer: "https://api.workos.com/",
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            applicationID: clientId, // Shared issuer requires Audience check
        },
        {
            type: "customJwt",
            issuer: `https://api.workos.com/user_management/${clientId}`,
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            // Unique issuer -> No applicationID needed
        },
        {
            type: "customJwt",
            issuer: `https://api.workos.com/user_management/${clientId}/`,
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },
        {
            type: "customJwt",
            issuer: `https://api.workos.com/sso/oidc/${clientId}`,
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },
        {
            type: "customJwt",
            issuer: `https://api.workos.com/sso/oidc/${clientId}/`,
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },


        // AuthKit Domain (Staging)
        {
            type: "customJwt",
            issuer: "https://utter-bud-13-staging.authkit.app/",
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            // applicationID: clientId, // Might be shared, but let's try strict first
        },
        {
            type: "customJwt",
            issuer: `https://utter-bud-13-staging.authkit.app/user_management/${clientId}`,
            algorithm: "RS256",
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },

        // Dynamic Tenant Domain
        ...(process.env.WORKOS_ISSUER ? [
            {
                type: "customJwt",
                issuer: process.env.WORKOS_ISSUER,
                algorithm: "RS256",
                jwks: `https://api.workos.com/sso/jwks/${clientId}`,
                applicationID: clientId,
            },
            {
                type: "customJwt",
                issuer: `${process.env.WORKOS_ISSUER}user_management/${clientId}`,
                algorithm: "RS256",
                jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            },
            {
                type: "customJwt",
                issuer: `${process.env.WORKOS_ISSUER}user_management/${clientId}/`,
                algorithm: "RS256",
                jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            },
            {
                type: "customJwt",
                issuer: `${process.env.WORKOS_ISSUER}sso/oidc/${clientId}`,
                algorithm: "RS256",
                jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            },
            {
                type: "customJwt",
                issuer: `${process.env.WORKOS_ISSUER}sso/oidc/${clientId}/`,
                algorithm: "RS256",
                jwks: `https://api.workos.com/sso/jwks/${clientId}`,
            }
        ] : [])
    ],
};

export default authConfig;
