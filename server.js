const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('./server-config');
const logger = require('./logger');
const { requestLogger, errorLogger, corsErrorLogger } = require('./middleware/requestLogger');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(requestLogger);
app.use(corsErrorLogger);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list
    if (config.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow Vercel deployments (any subdomain of vercel.app)
    if (origin && origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      return callback(null, true);
    }
    
    // Allow localhost with any port for development
    if (origin && origin.match(/^https?:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow any subdomain of gwsudan.xyz
    if (origin && origin.match(/^https?:\/\/.*\.gwsudan\.xyz$/)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || config.JWT_SECRET;

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.auth('Token validation', 'unknown', false, req.ip);
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.auth('Token validation', 'unknown', false, req.ip);
      return res.status(403).json({ message: 'Invalid token' });
    }
    logger.auth('Token validation', user.username, true, req.ip);
    req.user = user;
    next();
  });
};

// Admin-only middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      logger.auth('Admin access attempt', req.user.username, false, req.ip);
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    logger.logError('Admin role check error', error, { userId: req.user.userId, ip: req.ip });
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Register
app.post('/api/register', async (req, res) => {
  const startTime = Date.now();
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logger.auth('Registration attempt', username, false, req.ip);
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    const duration = Date.now() - startTime;
    logger.database('CREATE', 'user', duration);
    logger.auth('Registration', username, true, req.ip);
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.database('CREATE', 'user', duration, error);
    if (error.code === 'P2002') {
      logger.auth('Registration attempt', req.body.username, false, req.ip);
      res.status(400).json({ message: 'Username already exists' });
    } else {
      logger.logError('Registration error', error, { username: req.body.username, ip: req.ip });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const startTime = Date.now();
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logger.auth('Login attempt', username, false, req.ip);
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true
      }
    });

    if (!user) {
      logger.auth('Login attempt', username, false, req.ip);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.auth('Login attempt', username, false, req.ip);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    }, JWT_SECRET, {
      expiresIn: '24h',
    });

    const duration = Date.now() - startTime;
    logger.database('SELECT', 'user', duration);
    logger.auth('Login', username, true, req.ip);
    res.json({ 
      token, 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.database('SELECT', 'user', duration, error);
    logger.logError('Login error', error, { username: req.body.username, ip: req.ip });
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all neighborhoods
app.get('/api/neighborhoods', authenticateToken, async (req, res) => {
  try {
    const neighborhoods = await prisma.neighborhood.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(neighborhoods);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get squares by neighborhood
app.get('/api/neighborhoods/:id/squares', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const squares = await prisma.square.findMany({
      where: { neighborhoodId: id },
      orderBy: { name: 'asc' },
    });
    res.json(squares);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get houses by square
app.get('/api/squares/:id/houses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const houses = await prisma.house.findMany({
      where: { squareId: id },
      include: {
        square: {
          include: {
            neighborhood: true,
          },
        },
      },
      orderBy: { houseNumber: 'asc' },
    });
    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create neighborhood
app.post('/api/neighborhoods', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const neighborhood = await prisma.neighborhood.create({
      data: { name },
    });
    res.status(201).json(neighborhood);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Neighborhood name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Create square
app.post('/api/squares', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, neighborhoodId } = req.body;
    const square = await prisma.square.create({
      data: { name, neighborhoodId },
    });
    res.status(201).json(square);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create house
app.post('/api/houses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { houseNumber, ownerName, ownerPhone, isOccupied, hasPaid, paymentType, requiredAmount, receiptImage, squareId } = req.body;
    
    // Check if house number already exists in the same square
    const existingHouse = await prisma.house.findFirst({
      where: {
        houseNumber,
        squareId,
      },
    });

    if (existingHouse) {
      return res.status(400).json({ message: 'رقم المنزل موجود بالفعل في هذا المربع' });
    }

    const house = await prisma.house.create({
      data: {
        houseNumber,
        ownerName,
        ownerPhone,
        isOccupied: isOccupied ?? true,
        hasPaid: hasPaid ?? false,
        paymentType: paymentType ?? 'SMALL_METER',
        requiredAmount,
        receiptImage,
        squareId,
      },
    });
    res.status(201).json(house);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update house
app.put('/api/houses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { houseNumber, ownerName, ownerPhone, isOccupied, hasPaid, paymentType, requiredAmount, receiptImage } = req.body;
    
    // Get the current house to check its squareId
    const currentHouse = await prisma.house.findUnique({
      where: { id },
    });

    if (!currentHouse) {
      return res.status(404).json({ message: 'المنزل غير موجود' });
    }

    // Check if house number already exists in the same square (excluding current house)
    const existingHouse = await prisma.house.findFirst({
      where: {
        houseNumber,
        squareId: currentHouse.squareId,
        id: { not: id },
      },
    });

    if (existingHouse) {
      return res.status(400).json({ message: 'رقم المنزل موجود بالفعل في هذا المربع' });
    }
    
    const house = await prisma.house.update({
      where: { id },
      data: {
        houseNumber,
        ownerName,
        ownerPhone,
        isOccupied,
        hasPaid,
        paymentType,
        requiredAmount,
        receiptImage,
      },
    });
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete house
app.delete('/api/houses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.house.delete({
      where: { id },
    });
    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const updateData = { username };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id },
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all squares
app.get('/api/squares', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const squares = await prisma.square.findMany({
      include: {
        neighborhood: true,
        houses: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(squares);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get square by ID
app.get('/api/squares/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const square = await prisma.square.findUnique({
      where: { id },
      include: {
        neighborhood: true,
        houses: true,
      },
    });
    if (!square) {
      return res.status(404).json({ message: 'Square not found' });
    }
    res.json(square);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update square
app.put('/api/squares/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, neighborhoodId } = req.body;
    
    const square = await prisma.square.update({
      where: { id },
      data: { name, neighborhoodId },
      include: {
        neighborhood: true,
        houses: true,
      },
    });
    res.json(square);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete square
app.delete('/api/squares/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.square.delete({
      where: { id },
    });
    res.json({ message: 'Square deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update neighborhood
app.put('/api/neighborhoods/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const neighborhood = await prisma.neighborhood.update({
      where: { id },
      data: { name },
    });
    res.json(neighborhood);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Neighborhood name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Delete neighborhood
app.delete('/api/neighborhoods/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.neighborhood.delete({
      where: { id },
    });
    res.json({ message: 'Neighborhood deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all houses
app.get('/api/houses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const houses = await prisma.house.findMany({
      include: {
        square: {
          include: {
            neighborhood: true,
          },
        },
      },
      orderBy: { houseNumber: 'asc' },
    });
    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get squares export data
app.get('/api/squares/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const squares = await prisma.square.findMany({
      include: {
        neighborhood: true,
        houses: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(squares);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile (for auth context)
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || config.PORT;
const HOST = process.env.HOST || config.HOST;

// Error handling middleware
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  logger.logError('Unhandled error', err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res) => {
  logger.connectivity(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, HOST, () => {
  logger.server(`Server started successfully`, {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://217.154.244.187:${PORT}`);
  console.log(`Logs directory: ${__dirname}/logs`);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
