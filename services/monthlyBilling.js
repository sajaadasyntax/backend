const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

// Payment amounts for each type
const PAYMENT_AMOUNTS = {
  SMALL_METER: 5000,
  MEDIUM_METER: 10000,
  LARGE_METER: 15000,
};

/**
 * Process monthly billing for all houses
 * This function should be called on the 31st of each month
 */
async function processMonthlyBilling() {
  try {
    logger.info('Starting monthly billing process...');
    
    // Get all occupied houses
    const houses = await prisma.house.findMany({
      where: {
        isOccupied: true,
      },
      include: {
        square: {
          include: {
            neighborhood: true,
          },
        },
      },
    });

    let processedCount = 0;
    let errorCount = 0;

    for (const house of houses) {
      try {
        // Reset payment status for all houses
        await prisma.house.update({
          where: { id: house.id },
          data: {
            hasPaid: false,
            lastPaymentDate: null,
            // Set required amount based on payment type
            requiredAmount: PAYMENT_AMOUNTS[house.paymentType] || PAYMENT_AMOUNTS.SMALL_METER,
          },
        });

        processedCount++;
        logger.info(`Reset payment status for house ${house.houseNumber} in ${house.square.neighborhood.name} - ${house.square.name}`);
      } catch (error) {
        errorCount++;
        logger.logError(`Error processing house ${house.id}`, error, { houseId: house.id });
      }
    }

    logger.info(`Monthly billing completed. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processedCount,
      errorCount,
      totalHouses: houses.length,
    };
  } catch (error) {
    logger.logError('Monthly billing process failed', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if today is the 31st day of the month
 */
function isLastDayOfMonth() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return today.getMonth() !== tomorrow.getMonth();
}

/**
 * Check if it's the 31st day of the month
 */
function is31stDay() {
  const today = new Date();
  return today.getDate() === 31;
}

/**
 * Run monthly billing if it's the 31st day
 */
async function checkAndRunMonthlyBilling() {
  if (is31stDay() || isLastDayOfMonth()) {
    logger.info('31st day detected, running monthly billing...');
    return await processMonthlyBilling();
  }
  
  return {
    success: true,
    message: 'Not the 31st day, skipping monthly billing',
  };
}

/**
 * Manual trigger for monthly billing (for admin use)
 */
async function triggerMonthlyBilling() {
  logger.info('Manual monthly billing triggered');
  return await processMonthlyBilling();
}

module.exports = {
  processMonthlyBilling,
  checkAndRunMonthlyBilling,
  triggerMonthlyBilling,
  is31stDay,
  isLastDayOfMonth,
};
