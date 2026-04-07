const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Create Clubs
    const webClub = await prisma.club.upsert({
        where: { handle: 'webclub' },
        update: {},
        create: {
            name: 'Web Club NITK',
            handle: 'webclub',
            description: 'The official Web Enthusiasts Club of NITK.',
        }
    });

    const ieee = await prisma.club.upsert({
        where: { handle: 'ieeenitk' },
        update: {},
        create: {
            name: 'IEEE NITK',
            handle: 'ieeenitk',
            description: 'Institute of Electrical and Electronics Engineers NITK Student Branch.',
        }
    });

    // Create Events
    await prisma.event.create({
        data: {
            title: 'HackVerse 4.0 Info Session',
            date: new Date(new Date().setDate(new Date().getDate() + 3)), // 3 days from now
            time: '18:00',
            venue: 'LHC-C',
            description: 'Come learn about the biggest hackathon in NITK and how to register.',
            clubId: webClub.id,
            registrationLink: 'https://hackverse.nitk.ac.in',
        }
    });

    await prisma.event.create({
        data: {
            title: 'Machine Learning Workshop',
            date: new Date(new Date().setDate(new Date().getDate() + 5)), // 5 days from now
            time: '17:30',
            venue: 'NTB',
            description: 'Hands-on session on building your first neural network.',
            clubId: ieee.id,
        }
    });

    console.log("Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
