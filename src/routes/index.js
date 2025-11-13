import express from "express";

import agoraRoutes from "./agoraRoutes.js";
import eventRoutes from "./eventRoutes.js";
import voiceRoutes from "./voiceRoutes.js";
import conversationRoutes from "./conversationRoutes.js";

const router = express.Router();

router.use("/agora", agoraRoutes);
router.use("/events", eventRoutes);
router.use("/voice", voiceRoutes);
router.use("/conversations", conversationRoutes);

export default router;

