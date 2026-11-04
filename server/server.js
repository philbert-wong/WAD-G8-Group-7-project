// Starts our API server. Same layout as the class's wk5 blog-with-mongodb/server.js:
// require the packages and routes, set up express, connect to MongoDB, then listen.
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

// Specify the path to the environment variable file 'config.env'.
// (Done before the routes are required, because the controllers read process.env when they load.)
dotenv.config({ path: './config.env' });

const blocksRoutes = require('./routes/blocks-routes');
const shortlistRoutes = require('./routes/shortlist-routes');
const authRoutes = require('./routes/auth-routes');
const amenitiesRoutes = require('./routes/amenities-routes');
const errorHandler = require('./middleware/errorHandler');

// ADDED: Affordability
const affordabilityRoutes = require('./routes/affordability-routes');

const server = express();

// Lets our Vue site (a different port, e.g. localhost:5173) read this API's answers. Same one line as the class servers.
server.use(cors());

// express.json() is a middleware: lets us read JSON sent in a POST / PUT / PATCH body
server.use(express.json());

// GET /api/health: a quick "is the server running?" check
function healthCheck(req, res) {
  res.json({ status: 'ok' });
}

// Any other /api/... address does not exist
function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

// root routes
server.get('/api/health', healthCheck);
server.use('/api/blocks', blocksRoutes);
server.use('/api/shortlist', shortlistRoutes);
server.use('/api/auth', authRoutes);
server.use('/api/amenities', amenitiesRoutes); // map: MRT / hawker / park / school dots

// ADDED: Affordability
server.use('/api/affordability', affordabilityRoutes);

server.use('/api', notFound);

server.use(errorHandler); // must be last

// async function to connect to DB
async function connectDB() {
  // DB in config.env if it is there, otherwise the MongoDB running on this computer
  let dbAddress = 'mongodb://127.0.0.1:27017/check-in';
  if (process.env.DB) {
    dbAddress = process.env.DB;
  }

  try {
    await mongoose.connect(dbAddress, { serverSelectionTimeoutMS: 8000 });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Check DB in your config.env file (or start MongoDB on this computer).');
    process.exit(1);
  }
}

function startServer() {
  // 8000 like class, unless config.env (or the hosting site) gives a PORT
  let port = 8000;
  if (process.env.PORT) {
    port = Number(process.env.PORT);
  }

  // Express calls this once the server has started, or if starting failed
  // (then "error" says why, e.g. the port is already used by another program).
  function onListening(error) {
    if (error) {
      if (error.code === 'EADDRINUSE') {
        console.error('Port ' + port + ' is already in use. Stop the other program, or set a different PORT in config.env');
      } else {
        console.error(error.message);
      }
      process.exit(1);
    }
    console.log('Server running at http://localhost:' + port + '/');
  }

  server.listen(port, onListening);
}

// call connectDB first and when connection is ready we start the web server
connectDB().then(startServer);
