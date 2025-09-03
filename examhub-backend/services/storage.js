const AWS = require("aws-sdk");

const spacesEndpoint = new AWS.Endpoint("blr1.digitaloceanspaces.com");

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: "DO00WAZPKYEYV9U7DPVN",
  secretAccessKey: "IMMU+pwgaDEJlOAngCE2W9VybFVqdxl+4CUSdP+yiDw",
  region: "blr1"
});

module.exports = s3;
