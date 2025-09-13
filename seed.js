const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('بدء إعداد قاعدة البيانات...');

  // إنشاء مستخدم افتراضي
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
    },
  });
  console.log('تم إنشاء المستخدم الافتراضي:', user.username);

  // إنشاء أحياء عينة
  const neighborhoods = [
    { name: 'الحي الشمالي' },
    { name: 'الحي الجنوبي' },
    { name: 'الحي الشرقي' },
    { name: 'الحي الغربي' },
    { name: 'الحي المركزي' },
  ];

  for (const neighborhoodData of neighborhoods) {
    const neighborhood = await prisma.neighborhood.upsert({
      where: { name: neighborhoodData.name },
      update: {},
      create: neighborhoodData,
    });
    console.log('تم إنشاء الحي:', neighborhood.name);

    // إنشاء مربعات لكل حي
    const squares = [
      { name: 'المربع الأول' },
      { name: 'المربع الثاني' },
      { name: 'المربع الثالث' },
    ];

    for (const squareData of squares) {
      // Check if square already exists
      const existingSquare = await prisma.square.findFirst({
        where: {
          name: squareData.name,
          neighborhoodId: neighborhood.id,
        },
      });

      let square;
      if (existingSquare) {
        square = existingSquare;
        console.log('المربع موجود بالفعل:', square.name, 'في', neighborhood.name);
      } else {
        square = await prisma.square.create({
          data: {
            name: squareData.name,
            neighborhoodId: neighborhood.id,
          },
        });
        console.log('تم إنشاء المربع:', square.name, 'في', neighborhood.name);
      }

      // إنشاء منازل عينة لكل مربع
      for (let i = 1; i <= 5; i++) {
        // Check if house already exists
        const existingHouse = await prisma.house.findFirst({
          where: {
            houseNumber: i.toString(),
            squareId: square.id,
          },
        });

            if (!existingHouse) {
              const paymentTypes = ['SMALL_METER', 'MEDIUM_METER', 'LARGE_METER'];
              const randomPaymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
              const paymentAmounts = { 'SMALL_METER': 5000, 'MEDIUM_METER': 10000, 'LARGE_METER': 15000 };
              
              await prisma.house.create({
                data: {
                  houseNumber: i.toString(),
                  ownerName: `صاحب المنزل ${i}`,
                  ownerPhone: `07${Math.floor(Math.random() * 100000000)}`,
                  isOccupied: Math.random() > 0.2,
                  hasPaid: Math.random() > 0.3,
                  paymentType: randomPaymentType,
                  requiredAmount: paymentAmounts[randomPaymentType],
                  squareId: square.id,
                },
              });
            }
      }
      console.log('تم إنشاء 5 منازل في', square.name);
    }
  }

  console.log('تم إعداد قاعدة البيانات بنجاح!');
  console.log('يمكنك تسجيل الدخول باستخدام:');
  console.log('اسم المستخدم: admin');
  console.log('كلمة المرور: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
