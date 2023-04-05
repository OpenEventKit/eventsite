import { getEnvVariable, AUTHORIZED_DEFAULT_PATH } from './envVariables'

export const getDefaultLocation = (eventRedirect, hasVirtualAccess = false) => {
    const defaultRedirect = hasVirtualAccess ? '/a/' : '/';
    return eventRedirect ? `/a/event/${eventRedirect}` : getEnvVariable(AUTHORIZED_DEFAULT_PATH) ? getEnvVariable(AUTHORIZED_DEFAULT_PATH) : defaultRedirect;
}

export const formatThirdPartyProviders = (providersArray) => {
    const providers = [
        { button_color: '#082238', provider_label: 'Continue with FNid', provider_param: '', provider_logo: '../img/logo_fn.svg', provider_logo_size: 35 },
    ];

    const thirdPartyProviders = [
        { button_color: '#1877F2', provider_label: 'Continue with Facebook', provider_param: 'facebook', provider_logo: '../img/third-party-idp/logo_facebook.svg', provider_logo_size: 22 },
        { button_color: '#0A66C2', provider_label: 'Sign in with LinkedIn', provider_param: 'linkedin', provider_logo: '../img/third-party-idp/logo_linkedin.svg', provider_logo_size: 21 },
        { button_color: '#000000', provider_label: 'Continue with Apple', provider_param: 'apple', provider_logo: '../img/third-party-idp/logo_apple.svg', provider_logo_size: 19 }
    ];

    return [...providers, ...thirdPartyProviders.filter(p => providersArray && providersArray.includes(p.provider_param))];
};