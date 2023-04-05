import summitData from '../content/summit.json';
import extraQuestions from '../content/extra-questions.json';
import { START_LOADING, STOP_LOADING } from "openstack-uicore-foundation/lib/utils/actions";
import { LOGOUT_USER } from "openstack-uicore-foundation/lib/security/actions";
import { RESET_STATE, GET_THIRD_PARTY_PROVIDERS, SYNC_DATA } from "../actions/base-actions-definitions";
import { GET_EXTRA_QUESTIONS } from '../actions/user-actions';

const DEFAULT_STATE = {
  loading: false,
  third_party_providers: [],
  summit: summitData,
  allows_native_auth: true,
  allows_otp_auth: true,
  extra_questions: extraQuestions
};

const summitReducer = (state = DEFAULT_STATE, action) => {
  const { type, payload } = action;

  switch (type) {
    case SYNC_DATA: {
      const {summitData} = payload;
      return {...state, summit: summitData};
    }
    case RESET_STATE:
    case LOGOUT_USER:
      return DEFAULT_STATE;
    case START_LOADING:
      return { ...state, loading: true };
    case STOP_LOADING:
      return { ...state, loading: false };
    case GET_THIRD_PARTY_PROVIDERS:

      const { third_party_identity_providers : third_party_providers, allows_native_auth, allows_otp_auth } = payload.response;
      return { ...state,
                  loading: false,
                  third_party_providers: third_party_providers || [],
                  allows_native_auth,
                  allows_otp_auth
            };
    case GET_EXTRA_QUESTIONS: {
      const extraQuestions = payload.response.data;
      return { ...state, loading: false, extra_questions: extraQuestions }
    }
    default:
      return state;
  }
};

export default summitReducer
