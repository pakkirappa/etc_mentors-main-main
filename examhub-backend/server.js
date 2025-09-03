require('dotenv').config(); // Load env first

const express = require('express');
const cors = require('cors');
const routes = require('./routes/web');
const errorHandler = require('./middleware/errorHandler');

const path = require('path');
const app = express();
const authRoutes = require('./routes/mobile/auth.routes');
const dashboardRoutes = require('./routes/mobile/dashboard.routes');
const dailyExamPortal = require('./routes/mobile/exams.routes');
const examParticipation = require('./routes/mobile/examParticipation.routes');
const results = require('./routes/mobile/results.routes');
const profileController = require('./routes/mobile/profile.routes');
const authroutsweb = require('./routes/web/auth');

// Middleware (apply early)
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (after middleware)
app.use('/api', routes);
app.use('/api/mobile/auth', authRoutes);
app.use('/api/mobile/dashboard', dashboardRoutes);
app.use('/api/mobile/exams', dailyExamPortal);
app.use('/api/mobile/examParticipation', examParticipation);
app.use('/api/mobile/results', results);
app.use('/api/mobile/profile', profileController);
app.use('/api/auth', authroutsweb);

// Error Handling (last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
