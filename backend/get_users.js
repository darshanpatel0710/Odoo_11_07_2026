const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.users.findMany().then(users => console.log(JSON.stringify(users, null, 2))).catch(console.error).finally(() => prisma.$disconnect());
