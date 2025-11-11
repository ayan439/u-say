const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

function generateRtcToken(channelName, uid = 0, expireSeconds = 3600) {
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;
  const role = RtcRole.PUBLISHER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeTs = currentTimestamp + expireSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeTs);
  return token;
}

module.exports = { generateRtcToken };
