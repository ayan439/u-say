// agoraToken.js
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

export function generateRtcToken(channelName, uid, ttlSeconds = 3600) {
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;
  const role = RtcRole.PUBLISHER; // user will publish/subscribe to audio
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + ttlSeconds;
  const numericUid = Number(uid);
  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    numericUid,
    role,
    privilegeExpireTs
  );
  return token;
}
