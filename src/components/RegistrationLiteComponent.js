import React, { useEffect, useState } from "react"
import * as Sentry from "@sentry/react";
import { navigate, withPrefix } from "gatsby"
import { connect } from "react-redux";
import URI from "urijs"
// these two libraries are client-side only
import RegistrationLiteWidget from 'summit-registration-lite/dist';
import FragmentParser from "openstack-uicore-foundation/lib/utils/fragment-parser";
import {doLogin, passwordlessStart, getAccessToken} from 'openstack-uicore-foundation/lib/security/methods'
import {doLogout} from 'openstack-uicore-foundation/lib/security/actions'
import {getEnvVariable, SUMMIT_API_BASE_URL, OAUTH2_CLIENT_ID, REGISTRATION_BASE_URL, SUPPORT_EMAIL} from '../utils/envVariables'
import {getUserProfile, setPasswordlessLogin, setUserOrder, checkOrderData} from "../actions/user-actions";
import {getThirdPartyProviders} from "../actions/base-actions";
import {formatThirdPartyProviders} from "../utils/loginUtils";
import 'summit-registration-lite/dist/index.css';
import styles from '../styles/marketing-hero.module.scss'
import Swal from "sweetalert2";
import {checkRequireExtraQuestionsByAttendee} from "../actions/user-actions";
import {userHasAccessLevel, VirtualAccessLevel} from "../utils/authorizedGroups";

import { SentryFallbackFunction } from "./SentryErrorComponent";

const RegistrationLiteComponent = ({
                                       registrationProfile,
                                       userProfile,
                                       attendee,
                                       getThirdPartyProviders,
                                       thirdPartyProviders,
                                       getUserProfile,
                                       setPasswordlessLogin,
                                       setUserOrder,
                                       checkOrderData,
                                       loadingProfile,
                                       loadingIDP,
                                       summit,
                                       colorSettings,
                                       siteSettings,
                                       allowsNativeAuth,
                                       allowsOtpAuth,
                                       checkRequireExtraQuestionsByAttendee,
                                   }) => {
    const [isActive, setIsActive] = useState(false);
    const [initialEmailValue, setInitialEmailValue] = useState('');

    useEffect(() => {
        const fragmentParser = new FragmentParser();
        setIsActive(fragmentParser.getParam('registration'));
        const paramInitialEmailValue = fragmentParser.getParam('email');
        if (paramInitialEmailValue)
            setInitialEmailValue(paramInitialEmailValue);
    }, []);

    useEffect(() => {
        if (!thirdPartyProviders.length) getThirdPartyProviders();
    }, [thirdPartyProviders]);

    const getBackURL = () => {
        let backUrl = '/#registration=1';
        return URI.encode(backUrl);
    };

    const onClickLogin = (provider) => {
        doLogin(getBackURL(), provider);
    };

    const handleCompanyError = () => {
        console.log('company error...')
        Swal.fire("ERROR", "Hold on. Your session expired!.", "error").then(() => {
            // save current location and summit slug, for further redirect logic
            window.localStorage.setItem('post_logout_redirect_path', new URI(window.location.href).pathname());
            doLogout();
        });
    }

    const getPasswordlessCode = (email) => {
        const params = {
            connection: "email",
            send: "code",
            redirect_uri: `${window.location.origin}/auth/callback`,
            email,
        };

        return passwordlessStart(params)
    };

    const loginPasswordless = (code, email) => {
        const params = {
            connection: "email",
            otp: code,
            email
        };
        return setPasswordlessLogin(params);
    };

    const widgetProps = {
        apiBaseUrl: getEnvVariable(SUMMIT_API_BASE_URL),
        clientId: getEnvVariable(OAUTH2_CLIENT_ID),
        summitData: summit,
        profileData: registrationProfile,
        marketingData: colorSettings,
        loginOptions: formatThirdPartyProviders(thirdPartyProviders),
        loading: loadingProfile || loadingIDP,
        // only show info if its not a recent purchase
        ticketOwned: userProfile?.summit_tickets?.length > 0,
        hasVirtualAccessLevel: userHasAccessLevel(userProfile?.summit_tickets, VirtualAccessLevel),
        ownedTickets: attendee?.ticket_types || [],
        authUser: (provider) => onClickLogin(provider),
        getPasswordlessCode: getPasswordlessCode,
        loginWithCode:  (code, email) =>  loginPasswordless(code, email).then( () =>  navigate('/#registration=1')),
        getAccessToken: getAccessToken,
        closeWidget:  () => {
            // reload user profile
            // NOTE: We need to catch the rejected promise here, or else the app will crash (locally, at least).
            getUserProfile();
            setIsActive(false);
        },
        goToExtraQuestions: () => {
            navigate('/a/extra-questions');
        },
        goToEvent: () => navigate('/a/'),
        goToRegistration: () => navigate(`${getEnvVariable(REGISTRATION_BASE_URL)}/a/${summit.slug}`),
        goToMyOrders: () => navigate('/a/my-tickets'),
        completedExtraQuestions: (order) => {
            const currentUserTicket = order?.tickets.find(t => t?.owner?.email == userProfile?.email);
            const currentAttendee = attendee ? attendee : (currentUserTicket ? currentUserTicket?.owner : null);
            if(!currentAttendee) return true;
            return checkRequireExtraQuestionsByAttendee(currentAttendee);
        },
        onPurchaseComplete: (order) => {
            // check if it's necessary to update profile
            setUserOrder(order).then(()=> checkOrderData(order));
        },
        inPersonDisclaimer: siteSettings?.registration_in_person_disclaimer,
        handleCompanyError: () => handleCompanyError,
        allowsNativeAuth: allowsNativeAuth,
        allowsOtpAuth: allowsOtpAuth,
        stripeOptions: {
            fonts: [{cssSrc: withPrefix('/fonts/fonts.css')}],
            style: {base: {fontFamily: `'Nunito Sans', sans-serif`, fontWeight: 300}}
        },
        loginInitialEmailInputValue: initialEmailValue,
        authErrorCallback: (error) => {
            // we have an auth Error, perform logout
            const fragment = window?.location?.hash;
            return navigate('/auth/logout',
                {
                    state: {
                        backUrl: '/' + fragment
                    }
                });
        },
        allowPromoCodes: siteSettings?.REG_LITE_ALLOW_PROMO_CODES,
        companyInputPlaceholder: siteSettings?.REG_LITE_COMPANY_INPUT_PLACEHOLDER,
        companyDDLPlaceholder: siteSettings?.REG_LITE_COMPANY_DDL_PLACEHOLDER,
        supportEmail:getEnvVariable(SUPPORT_EMAIL),
    };

    const {registerButton} = siteSettings.heroBanner.buttons;

    return (
        <>
            {!summit.invite_only_registration &&
                <button className={`${styles.button} button is-large`} disabled={isActive}
                        onClick={() => setIsActive(true)}>
                    <i className={`fa fa-2x fa-edit icon is-large`}/>
                    <b>{registerButton.text}</b>
                </button>
            }
            <div>
                <Sentry.ErrorBoundary fallback={SentryFallbackFunction({componentName: 'Registration Lite'})}>
                    {isActive && <RegistrationLiteWidget {...widgetProps} />}
                </Sentry.ErrorBoundary>
            </div>
        </>
    )
};

const mapStateToProps = ({userState, summitState, settingState}) => {
    return ({
        registrationProfile: userState.idpProfile,
        userProfile: userState.userProfile,
        attendee: userState.attendee,
        loadingProfile: userState.loading,
        loadingIDP: userState.loadingIDP,
        thirdPartyProviders: summitState.third_party_providers,
        allowsNativeAuth: summitState.allows_native_auth,
        allowsOtpAuth: summitState.allows_otp_auth,
        summit: summitState.summit,
        colorSettings: settingState.colorSettings,
        siteSettings: settingState.siteSettings,
    })
};

export default connect(mapStateToProps, {
    getThirdPartyProviders,
    getUserProfile,
    setPasswordlessLogin,
    setUserOrder,
    checkOrderData,
    checkRequireExtraQuestionsByAttendee,
})(RegistrationLiteComponent)
