// agoraToken.js
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

export function generateRtcToken(channelName, uid, ttlSeconds = 3600) {
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;
  const role = RtcRole.PUBLISHER; // user will publish/subscribe to audio
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + ttlSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpireTs
  );
  return token;
}
