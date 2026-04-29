const { loadDotEnv } = require("./config/loadDotEnv");
const { createApp } = require("./app");

loadDotEnv();

const { server, config } = createApp();

server.listen(config.server.port, config.server.host, () => {
  console.log(
    `BrawlGG running on ${config.server.appBaseUrl} (bound to ${config.server.host}:${config.server.port})`
  );
});
