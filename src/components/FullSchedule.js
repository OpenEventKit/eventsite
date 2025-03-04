import React from "react";
import * as Sentry from "@sentry/react";
import { connect } from "react-redux";
import { needsLogin } from "../utils/alerts";
import { addToSchedule, removeFromSchedule } from "../actions/user-actions";
import { callAction, getShareLink } from "../actions/schedule-actions";

// these two libraries are client-side only
import Schedule from "full-schedule-widget/dist";
import "full-schedule-widget/dist/index.css";

import { SentryFallbackFunction } from "./SentryErrorComponent";

const FullSchedule = ({
  summit,
  className,
  userProfile,
  colorSettings,
  homeSettings,
  addToSchedule,
  removeFromSchedule,
  callAction,
  filters,
  view,
  allowClick = true,
  schedKey,
  ...rest
}) => {
  const componentProps = {
    title: "Schedule",
    summit,
    marketingSettings: colorSettings,
    userProfile,
    withThumbs: false,
    defaultImage: homeSettings.schedule_default_image,
    showSendEmail: false,
    onStartChat: null,
    shareLink: getShareLink(filters, view),
    filters,
    view,
    onEventClick: allowClick ? () => { } : null,
    needsLogin: needsLogin,
    triggerAction: (action, payload) => {
      switch (action) {
        case "ADDED_TO_SCHEDULE": {
          return addToSchedule(payload.event);
        }
        case "REMOVED_FROM_SCHEDULE": {
          return removeFromSchedule(payload.event);
        }
        default:
          return callAction(schedKey, action, payload);
      }
    },
    ...rest,
  };

  return (
    <div className={className || "schedule-container"}>
      <Sentry.ErrorBoundary fallback={SentryFallbackFunction({componentName: 'Full Schedule'})}>
        <Schedule {...componentProps} />
      </Sentry.ErrorBoundary>
    </div>
  );
};

const mapStateToProps = ({ userState, settingState }) => ({
  userProfile: userState.userProfile,
  colorSettings: settingState.colorSettings,
  homeSettings: settingState.homeSettings,
  allowClick: settingState?.widgets?.schedule?.allowClick || true
});

export default connect(mapStateToProps, {
  addToSchedule,
  removeFromSchedule,
  callAction,
})(FullSchedule);
