import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

export function generateRtcToken(channelName, uid, ttlSeconds = 3600) {
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;

  const role = RtcRole.PUBLISHER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + ttlSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    Number(uid),
    role,
    privilegeExpireTs
  );
}

