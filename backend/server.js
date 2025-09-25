require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 10000;  // Render default is 10000

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('[SERVER] Listen error:', err);
    process.exit(1);
  }
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});