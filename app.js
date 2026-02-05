require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression'); // gzip responses
const cors = require('cors');
const recipeRoutes = require('./routes/recipes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./api-docs.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use(compression()); // enable gzip (i am using this for lesser latency, do further optimisations as needed, currently all under 500ms)

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Swagger Routes
// 1. Serve the UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// 2. Serve the raw JSON (api-docs.json)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Use routes
app.use('/api/recipes', recipeRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Connected to server. Please navigate to /api/docs for documentation.');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});