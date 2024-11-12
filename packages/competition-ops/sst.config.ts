/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "mash-perpetuals-v1",
      home: "aws",
    };
  },
  async run() {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is not set");
    }
    new sst.aws.Cron("CompetitionRotate", {
      schedule: "cron(*/20 * * * ? *)", // Every 10 minutes
      job: {
        runtime: "nodejs20.x",
        handler: "src/index.handler",
        timeout: "15 minutes",
        memory: "2 GB",
        live: false,
        environment: {
          PRIVATE_KEY: process.env.PRIVATE_KEY,
          HEALTHCHECKS_URL: process.env.HEALTHCHECKS_URL,
        },
        nodejs: {
          format: "cjs",
        },
      },
    });
  },
});
