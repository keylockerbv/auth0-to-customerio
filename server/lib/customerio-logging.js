const _ = require("lodash");
const async = require("async");
const CIO = require("./customerio");
const loggingTools = require("auth0-log-extension-tools");
const managementApi = require("auth0-extension-tools").managementApi;
const tools = require("auth0-extension-tools");

const config = require("./config");
const logger = require("./logger");

const eventMap = {
  s: "logged_in_auth0",
  svr: "email_verification_requested",
  limit_wc: "blocked_account_auth0",
  sv: "email_verified",
};

module.exports = () => {
  logger.info(`Started Customer.io log sender`);

  const cio = new CIO(
    config("CUSTOMER_IO_SITE_ID"),
    config("CUSTOMER_IO_API_KEY")
  );

  return (logs, callback) => {
    if (!logs || !logs.length) {
      return callback();
    }

    logger.info(`Sending ${logs.length} logs to Customer.io.`);

    async.eachLimit(
      logs,
      10,
      (log, cb) => {
        if (!log.user_id) {
          return cb();
        }

        const event = eventMap[log.type];
        if (!event) {
          return cb();
        }

        return managementApi
          .getClient({
            domain: config("AUTH0_DOMAIN"),
            clientId: config("AUTH0_CLIENT_ID"),
            clientSecret: config("AUTH0_CLIENT_SECRET"),
          })
          .then((auth0) => auth0.users.get({ id: log.user_id }))
          .then(async (user) => {
            const req = cio.request;
            const customers = (
              await req.handler({
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + config("CUSTOMER_IO_API_KEY"),
                },
                uri:
                  "https://beta-api.customer.io/v1/api/customers?email=" +
                  user["email"],
                method: "GET",
              })
            ).results;
            return { customers, user };
          })
          .then(({ customers, user }) => {
            let promises = [];
            customers.forEach((customer) => {
              promises.push(
                cio.track(customer["id"], {
                  name: event,
                  timestamp: Date.parse(log.date) / 1000,
                })
              );
            });
            Promise.all(promises)
              .then(() => cb())
              .catch(cb);
          })
          .catch((err) => {
            if (err instanceof tools.NotFoundError) {
              logger.info("Skipping log entry because user was deleted");
              return cb();
            } else if (
              err instanceof tools.ManagementApiError ||
              err instanceof tools.ValidationError ||
              err instanceof tools.ArgumentError
            ) {
              // Prevent dumping the whole request with token to Slack.
              return cb(new Error(err.name + ": " + err.message));
            }
            return cb(err);
          });
      },
      callback
    );
  };
};
