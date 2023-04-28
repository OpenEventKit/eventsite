import React from "react";
import PropTypes from "prop-types";
import {navigate} from "gatsby";
import {connect} from "react-redux";
import { isEqual } from "lodash";
import Layout from "../components/Layout";
import DisqusComponent from "../components/DisqusComponent";
import AdvertiseComponent from "../components/AdvertiseComponent";
import Etherpad from "../components/Etherpad";
import { MemoizedVideoComponent as VideoComponent } from '../components/VideoComponent';
import TalkComponent from "../components/TalkComponent";
import DocumentsComponent from "../components/DocumentsComponent";
import VideoBanner from "../components/VideoBanner";
import SponsorComponent from "../components/SponsorComponent";
import NoTalkComponent from "../components/NoTalkComponent";
import HeroComponent from "../components/HeroComponent";
import UpcomingEventsComponent from "../components/UpcomingEventsComponent";
import Link from "../components/Link";
import AccessTracker, {AttendeesWidget} from "../components/AttendeeToAttendeeWidgetComponent"
import AttendanceTrackerComponent from "../components/AttendanceTrackerComponent";
import EventFeedbackComponent from '../components/EventFeedbackComponent'
import {PHASES} from '../utils/phasesUtils';
import { getEventById } from "../actions/event-actions";
import URI from "urijs"

/**
 * @type {EventPageTemplate}
 */
export const EventPageTemplate = class extends React.Component {

    constructor(props) {
        super(props);
        this.onEventChange = this.onEventChange.bind(this);
        this.canRenderVideo = this.canRenderVideo.bind(this);
    }

    onEventChange(ev) {
        const {eventId} = this.props;
        if (parseInt(eventId) !== parseInt(ev.id)) {
            navigate(`/a/event/${ev.id}`);
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {eventId, event, eventsPhases, lastDataSync} = this.props;
        if (eventId !== nextProps.eventId) return true;
        if (!isEqual(event, nextProps.event)) return true;
        // a synch did happened!
        if(lastDataSync !== nextProps.lastDataSync) return true;
        // compare current event phase with next one
        const currentPhase = eventsPhases.find((e) => parseInt(e.id) === parseInt(eventId))?.phase;
        const nextCurrentPhase = nextProps.eventsPhases.find(
            (e) => parseInt(e.id) === parseInt(eventId)
        )?.phase;
        const finishing = (currentPhase === PHASES.DURING && nextCurrentPhase === PHASES.AFTER);
        return (currentPhase !== nextCurrentPhase && !finishing );
    }

    canRenderVideo = (currentPhase) => {
        const {event} = this.props;
        return (currentPhase >= PHASES.DURING || event.streaming_type === 'VOD') && event.streaming_url;
    };

    componentDidUpdate(prevProps, prevState, snapshot) {
        const {eventId, event} = this.props;
        const {eventId: prevEventId} = prevProps;
        // event id could come as param at uri
        if (parseInt(eventId) !== parseInt(prevEventId) || parseInt(event?.id) !== parseInt(eventId)) {
            this.props.getEventById(eventId);
        }
    }

    componentDidMount() {
        const {eventId, event } = this.props;
        if (parseInt(event?.id) !== parseInt(eventId)) {
            this.props.getEventById(eventId);
        }
    }

    render() {

        const {event, user, loading, nowUtc, summit, eventsPhases, eventId, lastDataSync, activityCtaText} = this.props;
        // get current event phase
        const currentPhaseInfo = eventsPhases.find((e) => parseInt(e.id) === parseInt(eventId));
        const currentPhase = currentPhaseInfo?.phase;
        console.log(`EventPageTemplate::render lastDataSync ${lastDataSync} currentPhase ${currentPhase}`, currentPhaseInfo);
        const firstHalf = currentPhase === PHASES.DURING ? nowUtc < ((event?.start_date + event?.end_date) / 2) : false;
        const eventQuery = event.streaming_url ? URI(event.streaming_url).search(true) : null;
        const autoPlay = eventQuery?.autoplay !== '0';
        // Start time set into seconds, first number is minutes so it multiply per 60
        const startTime = eventQuery?.start?.split(',').reduce((a, b, index) => (index === 0 ? parseInt(b) * 60 : parseInt(b)) + a, 0);

        // if event is loading or we are still calculating the current phase ...
        if (loading || currentPhase === undefined || currentPhase === null) {
            return <HeroComponent title="Loading event"/>;
        }

        if (!event) {
            return <HeroComponent title="Event not found" redirectTo="/a/schedule"/>;
        }

        return (
            <React.Fragment>
                {/* <EventHeroComponent /> */}
                <section
                    className="section px-0 py-0"
                    style={{
                        marginBottom:
                            event.class_name !== "Presentation" ||
                            currentPhase < PHASES.DURING ||
                            !event.streaming_url
                                ? "-3rem"
                                : "",
                    }}
                >
                    <div className="columns is-gapless">
                        {this.canRenderVideo(currentPhase) ? (
                            <div className="column is-three-quarters px-0 py-0">
                                <VideoComponent
                                    url={event.streaming_url}
                                    title={event.title}
                                    namespace={summit.name}
                                    firstHalf={firstHalf}
                                    autoPlay={autoPlay}
                                    start={startTime}
                                />
                                {event.meeting_url && <VideoBanner event={event} ctaText={activityCtaText} />}
                            </div>
                        ) : (
                            <div className="column is-three-quarters px-0 py-0 is-full-mobile">
                                <NoTalkComponent
                                    currentEventPhase={currentPhase}
                                    event={event}
                                    summit={summit}
                                />
                            </div>
                        )}
                        {/* <div
                            className="column is-hidden-mobile"
                            style={{
                                position: "relative",
                                borderBottom: "1px solid #d3d3d3",
                            }}
                        >
                            <DisqusComponent
                                hideMobile={true}
                                event={event}
                                title="Public Conversation"
                            />
                        </div> */}
                    </div>
                </section>
                <section className="section px-0 pt-5 pb-0">
                    <div className="columns mx-0 my-0">
                        <div className="column is-three-quarters is-full-mobile">
                            <div className="px-5 py-5">
                                <TalkComponent
                                    currentEventPhase={currentPhase}
                                    event={event}
                                    summit={summit}
                                />
                            </div>
                            { event.allow_feedback &&
                                <div className="px-5 py-5">
                                    <EventFeedbackComponent eventId={event.id} />
                                </div>
                            }
                            <div className="px-5 py-0">
                                <SponsorComponent page="event"/>
                            </div>
                            {/* <div className="is-hidden-tablet">
                                <DisqusComponent
                                    hideMobile={false}
                                    event={event}
                                    title="Public Conversation"
                                />
                                ∆
                            </div> */}
                            {event.etherpad_link && (
                                <div className="column is-three-quarters">
                                    <Etherpad
                                        className="talk__etherpad"
                                        etherpad_link={event.etherpad_link}
                                        userName={user.userProfile.first_name}
                                    />
                                </div>
                            )}
                            {/* <UpcomingEventsComponent
                                key={`event_page_upcomming_event_${lastDataSync}`}
                                id={`event_page_upcomming_event_${lastDataSync}`}
                                trackId={event.track ? event.track.id : null}
                                eventCount={3}
                                title={
                                    event.track
                                        ? `Up Next on ${event.track.name}`
                                        : "Up Next"
                                }
                                renderEventLink={(event) => <Link to={`/a/event/${event.id}`}>{event.title}</Link>}
                                allEventsLink={
                                    <Link to={event.track ? `/a/schedule#track=${event.track.id}` : "/a/schedule"}>
                                        View all <span className="sr-only">events</span>
                                    </Link>
                                }
                            /> */}
                        </div>
                        <div className="column px-0 py-0 is-one-quarter is-full-mobile">
                            <DocumentsComponent event={event}/>
                            {/* <AccessTracker/> */}
                            {/* <AttendeesWidget user={user} event={event}/> */}
                            {/* <AdvertiseComponent section="event" column="right"/> */}
                        </div>
                    </div>
                </section>
            </React.Fragment>
        );
    }
};

const EventPage = ({
                       summit,
                       location,
                       loading,
                       event,
                       eventId,
                       user,
                       eventsPhases,
                       nowUtc,
                       getEventById,
                       lastUpdate,
                       activityCtaText,
                       lastDataSync,
                   }) => {

    return (
        <Layout location={location}>
            {event && event.id && (
                <AttendanceTrackerComponent
                    key={`att-tracker-${event.id}`}
                    sourceId={event.id}
                    sourceName="EVENT"
                />
            )}
            <EventPageTemplate
                summit={summit}
                event={event}
                eventId={eventId}
                loading={loading}
                user={user}
                eventsPhases={eventsPhases}
                nowUtc={nowUtc}
                location={location}
                getEventById={getEventById}
                lastUpdate={lastUpdate}
                activityCtaText={activityCtaText}
                lastDataSync={lastDataSync}
            />
        </Layout>
    );
};

EventPage.propTypes = {
    loading: PropTypes.bool,
    event: PropTypes.object,
    lastUpdate: PropTypes.object,
    eventId: PropTypes.string,
    user: PropTypes.object,
    eventsPhases: PropTypes.array,
    getEventById: PropTypes.func,
    activityCtaText: PropTypes.string,
};

EventPageTemplate.propTypes = {
    event: PropTypes.object,
    lastUpdate: PropTypes.object,
    loading: PropTypes.bool,
    eventId: PropTypes.string,
    user: PropTypes.object,
    eventsPhases: PropTypes.array,
    getEventById: PropTypes.func,
    activityCtaText: PropTypes.string,
};

const mapStateToProps = ({eventState, summitState, userState, clockState, settingState}) => ({
    loading: eventState.loading,
    event: eventState.event,
    user: userState,
    summit: summitState.summit,
    eventsPhases: clockState.events_phases,
    nowUtc: clockState.nowUtc,
    lastUpdate: eventState.lastUpdate,
    activityCtaText: settingState.siteSettings.ACTIVITY_CTA_TEXT,
    lastDataSync: settingState.lastDataSync,
});

export default connect(mapStateToProps, {
    getEventById,
})(EventPage);