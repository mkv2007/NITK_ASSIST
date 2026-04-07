const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { exec } = require('child_process');
const path = require('path');

// Get all events (for Chatbot context)
exports.getAllEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            include: { club: { select: { name: true, handle: true } } },
            orderBy: { date: 'asc' }
        });
        res.json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get personalized events (for Home Calendar)
exports.getPersonalizedEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find user's followed clubs
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { clubs: { select: { id: true } } }
        });
        
        if (!user) {
            return res.status(404).json({ message: "User not found. Please log in again." });
        }
        
        const followedClubIds = user.clubs.map(c => c.id);
        
        // Fetch events only for those clubs
        const events = await prisma.event.findMany({
            where: {
                clubId: { in: followedClubIds }
            },
            include: { club: { select: { name: true, handle: true, logoUrl: true } } },
            orderBy: { date: 'asc' }
        });
        
        res.json(events);
    } catch (error) {
        console.error("Error fetching personalized events:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Admin route to create an event (System Ingestion)
exports.createEvent = async (req, res) => {
    try {
        const { title, date, time, venue, description, registrationLink, imageUrl, eligibility, deadline, clubId } = req.body;
        
        // Prevent duplicate ingestion: Check if an event with the same title and clubId exists
        const existingEvent = await prisma.event.findFirst({
            where: {
                title,
                clubId: parseInt(clubId)
            }
        });

        if (existingEvent) {
            // Update the existing event instead of making a duplicate
            const updatedEvent = await prisma.event.update({
                where: { id: existingEvent.id },
                data: {
                    date: new Date(date),
                    time,
                    venue,
                    description,
                    registrationLink,
                    imageUrl,
                    eligibility,
                    deadline: deadline ? new Date(deadline) : null
                }
            });
            return res.status(200).json({ message: "Event updated", event: updatedEvent });
        }

        const newEvent = await prisma.event.create({
            data: {
                title,
                date: new Date(date), // ensure ISO string or date
                time,
                venue,
                description,
                registrationLink,
                imageUrl,
                eligibility,
                deadline: deadline ? new Date(deadline) : null,
                clubId: parseInt(clubId)
            }
        });
        
        res.status(201).json({ message: "Event created", event: newEvent });
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Manually trigger the Python scraper worker
exports.triggerScraper = async (req, res) => {
    try {
        const workerPath = path.join(__dirname, '../../ai-service/instagram_worker.py');
        const venvPython = path.join(__dirname, '../../ai-service/venv/Scripts/python.exe');
        
        // Run the python script asynchronously so we don't block the request forever
        exec(`"${venvPython}" "${workerPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Scraper execution error: ${error.message}`);
                return;
            }
            if (stderr) console.log(`Scraper Logs:\n${stderr}`);
            if (stdout) console.log(`Scraper Output:\n${stdout}`);
        });

        res.json({ message: "Scraper started in the background! Please check the backend terminal for logs." });
    } catch (error) {
        console.error("Error triggering scraper:", error);
        res.status(500).json({ message: "Failed to start scraper" });
    }
};
