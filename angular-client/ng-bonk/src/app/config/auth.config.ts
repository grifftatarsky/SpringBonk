import { AuthConfig } from 'angular-oauth2-oidc';

export const authCodeFlowConfig: AuthConfig = {
    issuer: 'http://localhost:7080/auth/realms/local-keycloak',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    clientId: 'local-keycloak-public',
    responseType: 'code',
    scope: 'openid',
    showDebugInformation: true,
    timeoutFactor: 0.01,

};
