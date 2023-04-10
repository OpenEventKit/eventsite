const axios = require('axios');
const path = require('path');
const fs = require("fs");
const webpack = require('webpack');
const {createFilePath} = require('gatsby-source-filesystem');
const SentryWebpackPlugin = require("@sentry/webpack-plugin");

const {ClientCredentials} = require('simple-oauth2');
const URI = require('urijs');
const sizeOf = require('image-size');
const colorsFilepath = 'src/content/colors.json';
const disqusFilepath = 'src/content/disqus-settings.json';
const marketingFilepath = 'src/content/marketing-site.json';
const homeFilepath = 'src/content/home-settings.json';
const settingsFilepath = 'src/content/settings.json';
const eventsFilePath = 'src/content/events.json';
const eventsIdxFilePath = 'src/content/events.idx.json';
const speakersFilePath = 'src/content/speakers.json';
const speakersIdxFilePath = 'src/content/speakers.idx.json';
const voteablePresentationFilePath = 'src/content/voteable_presentations.json';
const extraQuestionFilePath = 'src/content/extra-questions.json';
const summitFilePath = 'src/content/summit.json';

const fileBuildTimes = [];

const myEnv = require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});

const getAccessToken = async (config, scope) => {
  const client = new ClientCredentials(config);

  try {
    return await client.getToken({ scope });
  } catch (error) {
    console.log('Access Token error', error);
  }
};

const SSR_getMarketingSettings = async (baseUrl, summitId) => {

  const params = {
    per_page: 100,
  };

  return await axios.get(
    `${baseUrl}/api/public/v1/config-values/all/shows/${summitId}`,
    { params }
  )
    .then(response => {
      return response.data.data
    })
    .catch(e => console.log('ERROR: ', e));
};

const SSR_GetRemainingPages = async (endpoint, params, lastPage) => {
  // create an array with remaining pages to perform Promise.All
  const pages = [];
  for (let i = 2; i <= lastPage; i++) {
    pages.push(i);
  }

  let remainingPages = await Promise.all(pages.map(pageIdx => {
    return axios.get(endpoint ,
        { params : {
            ...params,
            page: pageIdx
          }
        }).then(({ data }) => data);
  }));

  return remainingPages.sort((a, b,) =>   a.current_page - b.current_page ).map(p => p.data).flat();
}

const SSR_getEvents = async (baseUrl, summitId, accessToken) => {

  const endpoint = `${baseUrl}/api/v1/summits/${summitId}/events/published`;

  const params = {
        access_token: accessToken,
        per_page: 50,
        page: 1,
        expand: 'slides, links, videos, media_uploads, type, track, track.allowed_access_levels, location, location.venue, location.floor, speakers, moderator, sponsors, current_attendance, groups, rsvp_template, tags',
  }

  return await axios.get(endpoint, { params }).then(async ({data}) => {

    console.log(`SSR_getEvents then data.current_page ${data.current_page} data.last_page ${data.last_page} total ${data.total}`)

    let remainingPages = await SSR_GetRemainingPages(endpoint, params, data.last_page);

    return [...data.data, ...remainingPages];

  }).catch(e => console.log('ERROR: ', e));
};

const SSR_getSpeakers = async (baseUrl, summitId, accessToken, filter = null) => {

  const params = {
    access_token: accessToken,
    per_page: 30,
    page: 1,
  };

  const endpoint = `${baseUrl}/api/v1/summits/${summitId}/speakers/on-schedule`;

  if (filter) {
    params['filter[]'] = filter;
  }

  return await axios.get(
      endpoint,
    { params }
  )
    .then(async ({data}) => {
      console.log(`SSR_getSpeakers then data.current_page ${data.current_page} data.last_page ${data.last_page} total ${data.total}`)

      let remainingPages = await SSR_GetRemainingPages(endpoint, params, data.last_page);

      return [ ...data.data, ...remainingPages];
    })
    .catch(e => console.log('ERROR: ', e));
};

const SSR_getSummit = async (baseUrl, summitId) => {

  const params = {
    expand: 'event_types,tracks,track_groups,presentation_levels,locations.rooms,locations.floors,order_extra_questions.values,schedule_settings,schedule_settings.filters,schedule_settings.pre_filters',
    t: Date.now()
  };

  return await axios.get(
    `${baseUrl}/api/public/v1/summits/${summitId}`,
    { params }
  )
    .then(({ data }) => data)
    .catch(e => console.log('ERROR: ', e));
};

const SSR_getSummitExtraQuestions = async (baseUrl, summitId, accessToken) => {

    let apiUrl = URI(`${baseUrl}/api/v1/summits/${summitId}/order-extra-questions`);
    apiUrl.addQuery('filter[]', 'class==MainQuestion');
    apiUrl.addQuery('filter[]', 'usage==Ticket');
    apiUrl.addQuery('expand', '*sub_question_rules,*sub_question,*values')
    apiUrl.addQuery('access_token', accessToken);
    apiUrl.addQuery('order', 'order');
    apiUrl.addQuery('page', 1);
    apiUrl.addQuery('per_page', 100);

    return await axios.get(apiUrl.toString())
        .then(({data}) => data.data)
        .catch(e => console.log('ERROR: ', e));
};

const SSR_getVoteablePresentations = async (baseUrl, summitId, accessToken) => {

  const endpoint = `${baseUrl}/api/v1/summits/${summitId}/presentations/voteable`;

  const params = {
    access_token: accessToken,
    per_page: 50,
    page: 1,
    filter: 'published==1',
    expand: 'slides, links, videos, media_uploads, type, track, track.allowed_access_levels, location, location.venue, location.floor, speakers, moderator, sponsors, current_attendance, groups, rsvp_template, tags',
  };

  return await axios.get(endpoint,
    { params }).then(async ({data}) => {

    console.log(`SSR_getVoteablePresentations  then data.current_page ${data.current_page} data.last_page ${data.last_page} total ${data.total}`)

    let remainingPages = await SSR_GetRemainingPages(endpoint, params, data.last_page);

    return [...data.data, ...remainingPages];
  })
    .catch(e => console.log('ERROR: ', e));
};

exports.onPreBootstrap = async () => {

  console.log('onPreBootstrap');

  const summitId = process.env.GATSBY_SUMMIT_ID;
  const summitApiBaseUrl = process.env.GATSBY_SUMMIT_API_BASE_URL;
  const marketingData = await SSR_getMarketingSettings(process.env.GATSBY_MARKETING_API_BASE_URL, process.env.GATSBY_SUMMIT_ID);
  const colorSettings = fs.existsSync(colorsFilepath) ? JSON.parse(fs.readFileSync(colorsFilepath)) : {};
  const disqusSettings = fs.existsSync(disqusFilepath) ? JSON.parse(fs.readFileSync(disqusFilepath)) : {};
  const marketingSite = fs.existsSync(marketingFilepath) ? JSON.parse(fs.readFileSync(marketingFilepath)) : {};
  const homeSettings = fs.existsSync(homeFilepath) ? JSON.parse(fs.readFileSync(homeFilepath)) : {};
  const globalSettings = fs.existsSync(settingsFilepath) ? JSON.parse(fs.readFileSync(settingsFilepath)) : {};

  const config = {
    client: {
      id: process.env.GATSBY_OAUTH2_CLIENT_ID_BUILD,
      secret: process.env.GATSBY_OAUTH2_CLIENT_SECRET_BUILD
    },
    auth: {
      tokenHost: process.env.GATSBY_IDP_BASE_URL,
      tokenPath: process.env.GATSBY_OAUTH_TOKEN_PATH
    },
    options: {
      authorizationMethod: 'header'
    }
  };

  const accessToken = await getAccessToken(config, process.env.GATSBY_BUILD_SCOPES).then(({ token }) => token.access_token);

  // Marketing Settings
  marketingData.map(({ key, value }) => {
    if (key.startsWith('color_')) colorSettings[key] = value;
    if (key.startsWith('disqus_')) disqusSettings[key] = value;
    if (key.startsWith('summit_')) marketingSite[key] = value;
        
    if (key === 'REG_LITE_COMPANY_INPUT_PLACEHOLDER') marketingSite[key] = value;
    if (key === 'REG_LITE_COMPANY_DDL_PLACEHOLDER') marketingSite[key] = value;
    if (key === 'REG_LITE_ALLOW_PROMO_CODES') marketingSite[key] = !!Number(value);
    if (key === 'schedule_default_image') homeSettings.schedule_default_image = value;
    if (key === 'registration_in_person_disclaimer') marketingSite[key] = value;
    if (key === 'ACTIVITY_CTA_TEXT') marketingSite[key] = value;
  });

  // Set the size property on marketing settings masonry if it's needed
  const migrateMasonry = (masonry) => {
      const sizeRequired = masonry.some(i => !i.hasOwnProperty("size"));
      if (sizeRequired) {
          return masonry.map((i) => {
              isSingle = masonry.some(img => sizeOf(`./static${img.images[0].image}`).height > sizeOf(`./static${i.images[0].image}`).height);
              return { ...i, size: isSingle ? 1: 2 }
          })
      }
      return masonry;
  }

  Object.keys(marketingSite).map((key) => {
      if (key === 'sponsors') marketingSite[key] = migrateMasonry(marketingSite[key]);
  });

  fs.writeFileSync(colorsFilepath, JSON.stringify(colorSettings), 'utf8');
  fs.writeFileSync(disqusFilepath, JSON.stringify(disqusSettings), 'utf8');
  fs.writeFileSync(marketingFilepath, JSON.stringify(marketingSite), 'utf8');
  fs.writeFileSync(homeFilepath, JSON.stringify(homeSettings), 'utf8');

  let sassColors = '';
  Object.entries(colorSettings).forEach(([key, value]) => sassColors += `$${key} : ${value};\n`);
  fs.writeFileSync('src/styles/colors.scss', sassColors, 'utf8');

  // summit
  const summit = await SSR_getSummit(summitApiBaseUrl, summitId);
  fileBuildTimes.push(
      {
        'file' : summitFilePath,
        'build_time': Date.now()
      });
  fs.writeFileSync(summitFilePath, JSON.stringify(summit), 'utf8');

  // Show Events
  const allEvents = await SSR_getEvents(summitApiBaseUrl, summitId, accessToken);
  fileBuildTimes.push(
      {
        'file': eventsFilePath,
        'build_time': Date.now()
      });
  console.log(`allEvents ${allEvents.length}`);

  fs.writeFileSync(eventsFilePath, JSON.stringify(allEvents), 'utf8');

  const allEventsIDX = {};
  allEvents.forEach((e, index) => allEventsIDX[e.id] = index);

  fileBuildTimes.push(
      {
        'file': eventsIdxFilePath,
        'build_time': Date.now()
      });
  fs.writeFileSync(eventsIdxFilePath, JSON.stringify(allEventsIDX), 'utf8');


  // Show Speakers
  const allSpeakers = await SSR_getSpeakers(summitApiBaseUrl, summitId, accessToken);
  console.log(`allSpeakers ${allSpeakers.length}`);
  fileBuildTimes.push(
      {
        'file': speakersFilePath,
        'build_time': Date.now()
      });

  fs.writeFileSync(speakersFilePath, JSON.stringify(allSpeakers), 'utf8');

  const allSpeakersIDX = {};
  allSpeakers.forEach((e, index) => allSpeakersIDX[e.id] = index);
  fileBuildTimes.push(
      {
        'file': speakersIdxFilePath,
        'build_time': Date.now()
      });
  fs.writeFileSync(speakersIdxFilePath, JSON.stringify(allSpeakersIDX), 'utf8');


  // Voteable Presentations

  const allVoteablePresentations = await SSR_getVoteablePresentations(summitApiBaseUrl, summitId, accessToken);
  console.log(`allVoteablePresentations ${allVoteablePresentations.length}`);
  fileBuildTimes.push(
      {
        'file':voteablePresentationFilePath,
        'build_time': Date.now()
      });
  fs.writeFileSync(voteablePresentationFilePath, JSON.stringify(allVoteablePresentations), 'utf8');

  // Get Summit Extra Questions
  const extraQuestions = await SSR_getSummitExtraQuestions(summitApiBaseUrl, summitId, accessToken);
  console.log(`extraQuestions ${extraQuestions.length}`);
  fileBuildTimes.push(
      {
        'file': extraQuestionFilePath,
        'build_time': Date.now()
      });

  fs.writeFileSync(extraQuestionFilePath, JSON.stringify(extraQuestions), 'utf8');

  // setting build times
  globalSettings.staticJsonFilesBuildTime = fileBuildTimes;
  globalSettings.lastBuild = Date.now();

  fs.writeFileSync(settingsFilepath, JSON.stringify(globalSettings), 'utf8');
};

// makes Summit logo optional for graphql queries
exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type Summit implements Node {
      logo: String
    }
  `;
  createTypes(typeDefs)
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;
  /**
   * Gatsby v4 Upgrade NOTE: This is no longer needed in `gatsby-remark-relative-images` v2.
   * @see https://www.npmjs.com/package/gatsby-remark-relative-images#v2-breaking-changes
   */
  // fmImagesToRelative(node); // convert image paths for gatsby images

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode });
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
};

exports.sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest
}) => {

  console.log('sourceNodes');
  const { createNode } = actions;
  const summit = fs.existsSync(summitFilePath) ? JSON.parse(fs.readFileSync(summitFilePath)) : {};
  const nodeContent = JSON.stringify(summit);

  const nodeMeta = {
    ...summit,
    id: createNodeId(`summit-${summit.id}`),
    summit_id: summit.id,
    parent: null,
    children: [],
    internal: {
      type: `Summit`,
      mediaType: `application/json`,
      content: nodeContent,
      contentDigest: createContentDigest(summit)
    }
  };

  const node = Object.assign({}, summit, nodeMeta);
  createNode(node)
};


exports.createPages = ({ actions, graphql }) => {
  const { createPage } = actions;

  return graphql(`
    {
      allMarkdownRemark(limit: 1000) {
        edges {
          node {
            id
            fields {
              slug
            }
            frontmatter {
              templateKey
            }
          }
        }
      }
    }
  `).then((result) => {
    if (result.errors) {
      result.errors.forEach((e) => console.error(e.toString()));
      return Promise.reject(result.errors)
    }

    const posts = result.data.allMarkdownRemark.edges;

    posts.forEach((edge) => {
      const id = edge.node.id;
      if (edge.node.fields.slug.match(/custom-pages/)) {
        edge.node.fields.slug = edge.node.fields.slug.replace('/custom-pages/', '/');
      }
      createPage({
        path: edge.node.fields.slug,
        component: path.resolve(
          `src/templates/${String(edge.node.frontmatter.templateKey)}.js`
        ),
        // additional data can be passed via context
        context: {
          id,
        },
      })
    })
  })
};

exports.onCreateWebpackConfig = ({ actions, plugins, loaders }) => {  
  actions.setWebpackConfig({
    resolve: {
      /**
       * Webpack removed automatic polyfills for these node APIs in v5,
       * so we need to patch them in the browser.
       * @see https://www.gatsbyjs.com/docs/reference/release-notes/migrating-from-v2-to-v3/#webpack-5-node-configuration-changed-nodefs-nodepath-
       * @see https://viglucci.io/how-to-polyfill-buffer-with-webpack-5
       */
      fallback: {
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/')
      }
    },
    // canvas is a jsdom external dependency
    externals: ['canvas'],
    experiments: {
      topLevelAwait: true,
    },
    // devtool: 'source-map',
    plugins: [
      plugins.define({
        'global.GENTLY': false,
        'global.BLOB': false
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
        // upload source maps only if we have an sentry auth token and we are at production
        ...('GATSBY_SENTRY_AUTH_TOKEN' in process.env && process.env.NODE_ENV === 'production') ?[
            new SentryWebpackPlugin({
          org: process.env.GATSBY_SENTRY_ORG,
          project: process.env.GATSBY_SENTRY_PROJECT,
          ignore: ["app-*", "polyfill-*", "framework-*", "webpack-runtime-*","~partytown"],
          // Specify the directory containing build artifacts
          include: [
              {
                  paths: ['src','public','.cache'],
                  urlPrefix: '~/',
              },
              {
                paths: ['node_modules/upcoming-events-widget/dist'],
                urlPrefix: '~/node_modules/upcoming-events-widget/dist',
              },
              {
                  paths: ['node_modules/summit-registration-lite/dist'],
                  urlPrefix: '~/node_modules/summit-registration-lite/dist',
              },
              {
                  paths: ['node_modules/full-schedule-widget/dist'],
                  urlPrefix: '~/node_modules/full-schedule-widget//dist',
              },
              {
                  paths: ['node_modules/schedule-filter-widget/dist'],
                  urlPrefix: '~/node_modules/schedule-filter-widget/dist',
              },
              {
                  paths: ['node_modules/lite-schedule-widget/dist'],
                  urlPrefix: '~/node_modules/lite-schedule-widget/dist',
              },
              {
                  paths: ['node_modules/live-event-widget/dist'],
                  urlPrefix: '~/node_modules/live-event-widget/dist',
              },
              {
                  paths: ['node_modules/attendee-to-attendee-widget/dist'],
                  urlPrefix: '~/node_modules/attendee-to-attendee-widget/dist',
              },
              {
                  paths: ['node_modules/openstack-uicore-foundation/lib'],
                  urlPrefix: '~/node_modules/openstack-uicore-foundation/lib',
              },
              {
                  paths: ['node_modules/speakers-widget/dist'],
                  urlPrefix: '~/node_modules/speakers-widget/dist',
              },
          ],
          // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
          // and needs the `project:releases` and `org:read` scopes
          authToken: process.env.GATSBY_SENTRY_AUTH_TOKEN,
          // Optionally uncomment the line below to override automatic release name detection
          release: process.env.GATSBY_SENTRY_RELEASE,
        })]:[],
    ]
  })  
};
