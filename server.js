require('dotenv').config();
const { validateEnv } = require('./config/env');

validateEnv();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const profileListRoutes = require('./routes/profileListRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoutes = require('./routes/jobRoutes');
const skillRoutes = require('./routes/skillRoutes');
const interviewExperienceRoutes = require('./routes/interviewExperienceRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'false' || trustProxy === '') {
  app.set('trust proxy', false);
} else {
  const num = parseInt(trustProxy, 10);
  app.set('trust proxy', isNaN(num) ? 1 : num);
}

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));

app.use(globalLimiter);

app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/profile', profileListRoutes);
app.use('/api/v1/resume', resumeRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/interview-experiences', interviewExperienceRoutes);
app.use('/api/v1/assessments', assessmentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});