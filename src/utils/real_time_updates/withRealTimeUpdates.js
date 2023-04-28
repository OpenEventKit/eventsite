import React from "react";
import _ from 'lodash';
import SupabaseClientBuilder from "../supabaseClientBuilder";
import {getEnvVariable, REAL_TIME_UPDATES_STRATEGY, SUPABASE_KEY, SUPABASE_URL} from "../envVariables";
import RealTimeStrategyFactory from "./strategies/RealTimeStrategyFactory";
import PropTypes from "prop-types";
import { synchEntityData } from "../../actions/update-data-actions";
import { updateLastCheckForNovelties } from "../../actions/base-actions";
import {connect} from 'react-redux'
import { getAccessToken } from "openstack-uicore-foundation/lib/security/methods";

const CHECK_FOR_NOVELTIES_DELAY = 5000;

/**
 * @param WrappedComponent
 * @returns {{propTypes: {}, defaultProps: {}, new(*): {render: {(): *, (): React.ReactNode}, componentWillUnmount: {(), (): void}, componentDidMount: {(), (): void}, shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean, componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void, getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any, componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void, componentWillMount?(): void, UNSAFE_componentWillMount?(): void, componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, context: any, setState<K extends keyof S>(state: (((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | Pick<S, K> | S | null), callback?: () => void): void, forceUpdate(callback?: () => void): void, readonly props: Readonly<P> & Readonly<{children?: React.ReactNode | undefined}>, state: Readonly<S>, refs: {[p: string]: React.ReactInstance}}, contextType?: React.Context<any> | undefined, new<P, S>(props: (Readonly<P> | P)): {render: {(): *, (): React.ReactNode}, componentWillUnmount: {(), (): void}, componentDidMount: {(), (): void}, shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean, componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void, getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any, componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void, componentWillMount?(): void, UNSAFE_componentWillMount?(): void, componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, context: any, setState<K extends keyof S>(state: (((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | Pick<S, K> | S | null), callback?: () => void): void, forceUpdate(callback?: () => void): void, readonly props: Readonly<P> & Readonly<{children?: React.ReactNode | undefined}>, state: Readonly<S>, refs: {[p: string]: React.ReactInstance}}, new<P, S>(props: P, context: any): {render: {(): *, (): React.ReactNode}, componentWillUnmount: {(), (): void}, componentDidMount: {(), (): void}, shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean, componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void, getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any, componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void, componentWillMount?(): void, UNSAFE_componentWillMount?(): void, componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, context: any, setState<K extends keyof S>(state: (((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | Pick<S, K> | S | null), callback?: () => void): void, forceUpdate(callback?: () => void): void, readonly props: Readonly<P> & Readonly<{children?: React.ReactNode | undefined}>, state: Readonly<S>, refs: {[p: string]: React.ReactInstance}}, prototype: {render: {(): *, (): React.ReactNode}, componentWillUnmount: {(), (): void}, componentDidMount: {(), (): void}, shouldComponentUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean, componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void, getSnapshotBeforeUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>): any, componentDidUpdate?(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void, componentWillMount?(): void, UNSAFE_componentWillMount?(): void, componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{}>, nextContext: any): void, componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, UNSAFE_componentWillUpdate?(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): void, context: any, setState<K extends keyof S>(state: (((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | Pick<S, K> | S | null), callback?: () => void): void, forceUpdate(callback?: () => void): void, readonly props: Readonly<P> & Readonly<{children?: React.ReactNode | undefined}>, state: Readonly<S>, refs: {[p: string]: React.ReactInstance}}}}
 */
const withRealTimeUpdates = WrappedComponent => {

    class HOC extends React.Component {

        static propTypes = {
            summit: PropTypes.object.isRequired,
        }

        static defaultProps = {}

        constructor(props) {
            super(props);

            let _this = this;
            this._worker = null;
            this.createRealTimeSubscription = this.createRealTimeSubscription.bind(this);
            this.queryRealTimeDB = this.queryRealTimeDB.bind(this);
            this.checkForPastNovelties = this.checkForPastNovelties.bind(this);
            this.clearRealTimeSubscription = this.clearRealTimeSubscription.bind(this);
            this.onVisibilityChange = this.onVisibilityChange.bind(this);
            this.processUpdates = this.processUpdates.bind(this);

            this._checkForPastNoveltiesDebounced = _.debounce(this.checkForPastNovelties, CHECK_FOR_NOVELTIES_DELAY);

            try {
                this._supabase = SupabaseClientBuilder.getClient(getEnvVariable(SUPABASE_URL), getEnvVariable(SUPABASE_KEY));
            } catch (e) {
                this._supabase = null;
                console.log(e);
            }

            // attributes
            this._currentStrategy = RealTimeStrategyFactory.build
            (
                getEnvVariable(REAL_TIME_UPDATES_STRATEGY),
                (payload) => {
                        const {updateLastCheckForNovelties} = _this.props;
                        updateLastCheckForNovelties(payload.created_at);
                        return _this.processUpdates([payload]);
                },
                this._checkForPastNoveltiesDebounced
            );
        }

        /**
         *
         * @param updates
         * @returns {Promise<void>}
         */
        async processUpdates(updates) {

            const {summit, allEvents, allIDXEvents, allSpeakers, allIDXSpeakers, synchEntityData} = this.props;

            if(!this._worker)
            {
                console.log('withRealTimeUpdates::processUpdates worker is null');
                return;
            }

            let accessToken = null;
            try {
                accessToken = await getAccessToken();
            } catch (e) {
                console.log('withRealTimeUpdates::processUpdates getAccessToken error: ', e);
            }

            this._worker.postMessage({
                accessToken: accessToken,
                noveltiesArray: JSON.stringify(updates),
                summit: JSON.stringify(summit),
                allEvents: JSON.stringify(allEvents),
                allIDXEvents: JSON.stringify(allIDXEvents),
                allSpeakers: JSON.stringify(allSpeakers),
                allIDXSpeakers: JSON.stringify(allIDXSpeakers),
            });

            this._worker.onmessage = ({
                                    data: {
                                        payload,
                                        entity,
                                        summit,
                                        eventsData,
                                        allIDXEvents: newAllIDXEvents,
                                        allSpeakers: newAllSpeakers,
                                        allIDXSpeakers: newAllIDXSpeakers
                                    }
                                }) => {

                console.log('withRealTimeUpdates::processUpdates calling synch worker on message ');

                synchEntityData
                (
                    payload,
                    entity,
                    summit,
                    eventsData,
                    newAllIDXEvents,
                    newAllSpeakers,
                    newAllIDXSpeakers
                )
            }
        }

        /**
         *
         * @param summitId
         * @param lastCheckForNovelties
         * @returns {Promise<*|boolean>}
         */
        async queryRealTimeDB(summitId, lastCheckForNovelties) {

            // if (!this._supabase) return Promise.resolve(false);

            // try {
            //     const res = await this._supabase
            //         .from('summit_entity_updates')
            //         .select('id,created_at,summit_id,entity_id,entity_type,entity_operator')
            //         .eq('summit_id', summitId)
            //         .gt('created_at', lastCheckForNovelties)
            //         .order('id', {ascending: true});

            //     if (res.error)
            //         throw new Error(res.error)

            //     if (res.data && res.data.length > 0) {
            //         return res.data;
            //     }

            //     return false;
            // } catch (e) {
            //     console.log("withRealTimeUpdates::queryRealTimeDB ERROR");
            //     console.log(e);
            // }
        }


        /**
         * @param summitId
         */
        createRealTimeSubscription(summitId) {
            try {
                console.log(`withRealTimeUpdates::createRealTimeSubscription summitId ${summitId}`);
                this._currentStrategy?.create(summitId);
                // always check for novelty bc to avoid former updates emitted before RT subscription
                this._checkForPastNoveltiesDebounced(summitId);
            } catch (e) {
                console.log('withRealTimeUpdates::createRealTimeSubscription', e);
            }
        }

        /**
         * @param summitId
         */
        checkForPastNovelties(summitId) {

            const { lastCheckForNovelties } = this.props;

            console.log(`withRealTimeUpdates::checkForPastNovelties for summit ${summitId} older than ${lastCheckForNovelties}`);

            const _this = this;

            this.queryRealTimeDB(summitId, lastCheckForNovelties).then((res) => {
                if (!res || (Array.isArray(res) && !res.length)){
                     console.log("withRealTimeUpdates::checkForPastNovelties res is empty");
                     return;
                }

                console.log('withRealTimeUpdates::checkForPastNovelties res has data', res);

                const {updateLastCheckForNovelties} = _this.props;

                _this.processUpdates(res);

                const lastP = res[res.length - 1]
                let {created_at: lastUpdateNovelty} = lastP;
                if (lastUpdateNovelty) {
                    // update lastCheckForNovelties
                    console.log(`withRealTimeUpdates::checkForPastNovelties setting new lastCheckForNovelties ${lastUpdateNovelty} from last queryRealTimeDB`);
                    updateLastCheckForNovelties(lastUpdateNovelty);
                }

            }).catch((err) => console.log(err));

        }

        clearRealTimeSubscription() {
            console.log("withRealTimeUpdates::clearRealTimeSubscription");

            if (this._currentStrategy)
                this._currentStrategy.close();
        }

        onVisibilityChange() {
            const { summit } = this.props;
            const visibilityState = document.visibilityState;

            if (visibilityState === "visible" && this._currentStrategy && this._currentStrategy.manageBackgroundErrors()) {

                if (this._currentStrategy.hasBackgroundError()) {
                    this.createRealTimeSubscription(summit?.id);
                    return;
                }

                this._checkForPastNoveltiesDebounced(summit?.id);
            }
        }

        componentDidMount() {
            console.log('withRealTimeUpdates::componentDidMount');
            const { summit } = this.props;

            console.log('withRealTimeUpdates::componentDidMount creating sync worker');

            if(this._worker){
                this._worker.terminate();
            }

            this._worker = new Worker(new URL('../../workers/synch.worker.js', import.meta.url), {type: 'module'});
            this._worker.onerror = (event) => {
                console.log('withRealTimeUpdates::componentDidMount There is an error with your worker!', event);
                alert(event.message + " (" + event.filename + ":" + event.lineno + ")");
            }

            this.createRealTimeSubscription(summit?.id);

            document.addEventListener("visibilitychange", this.onVisibilityChange, false)
        }

        componentWillUnmount() {
            console.log('withRealTimeUpdates::componentWillUnmount');
            document.removeEventListener("visibilitychange", this.onVisibilityChange)
            this.clearRealTimeSubscription();

            console.log('withRealTimeUpdates::componentWillUnmount terminating worker');
            this._worker.terminate();
            this._worker = null;
        }

        render() {
            return (
                <WrappedComponent {...this.props} />
            );
        }
    }

    const mapStateToProps = ({speakerState, allSchedulesState, settingState, summitState}) => ({
        summit: summitState?.summit,
        staticJsonFilesBuildTime: settingState.staticJsonFilesBuildTime,
        lastCheckForNovelties: settingState.lastCheckForNovelties,
        allEvents: allSchedulesState.allEvents,
        allIDXEvents: allSchedulesState.allIDXEvents,
        allSpeakers: speakerState.speakers,
        allIDXSpeakers: speakerState.allIDXSpeakers,
    });

    return connect(mapStateToProps, {
        synchEntityData,
        updateLastCheckForNovelties,
    })(HOC);
};

export default withRealTimeUpdates;