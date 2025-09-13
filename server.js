const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('./server-config');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: config.CORS_ORIGINS,
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
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({ token, userId: user.id, username: user.username });
  } catch (error) {
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
app.post('/api/neighborhoods', authenticateToken, async (req, res) => {
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
app.post('/api/squares', authenticateToken, async (req, res) => {
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
app.post('/api/houses', authenticateToken, async (req, res) => {
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
app.put('/api/houses/:id', authenticateToken, async (req, res) => {
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
app.delete('/api/houses/:id', authenticateToken, async (req, res) => {
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

const PORT = process.env.PORT || config.PORT;
const HOST = process.env.HOST || config.HOST;

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://217.154.244.187:${PORT}`);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
