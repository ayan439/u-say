require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const eventsController = require('./controllers/eventsController');
const convoController = require('./controllers/convoController');
const agoraController = require('./controllers/agoraController');

// Routes
app.use('/events', eventsController);
app.use('/conversations', convoController);
app.use('/agora', agoraController);

app.get('/', (req, res) => res.send({ status: 'ok' }));

module.exports = app;
