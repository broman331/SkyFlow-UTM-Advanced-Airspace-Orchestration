import express from 'express';
import cors from 'cors';
import geofenceRoutes from './routes/geofencing.routes';
import authRoutes from './routes/auth.routes';

export const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', geofenceRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('UTM Backend is Healthy');
});

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`UTM Backend Engine listening on port ${port}`);
});
