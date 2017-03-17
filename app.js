'use strict'
const express = require('express'),
  app = express(),
  port = process.env.PORT || 9000,
  bodyParser = require('body-parser');

// nginx limit is also 1mb, so can't go higher without upping nginx
app.use(bodyParser.json({limit: '1mb'}));
app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));


app.get('/', (req, res) => res.send('Hello'));
app.listen(port);
