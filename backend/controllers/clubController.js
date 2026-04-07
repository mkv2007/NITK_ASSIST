const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all clubs
exports.getAllClubs = async (req, res) => {
    try {
        const clubs = await prisma.club.findMany();
        res.json(clubs);
    } catch (error) {
        console.error("Error fetching clubs:", error);
        res.status(500).json({ message: "Server error", details: error.message, stack: error.stack });
    }
};

// Create a new club (Admin)
exports.createClub = async (req, res) => {
    try {
        const { name, handle, description, logoUrl } = req.body;
        
        // Remove @ from handle if user added it
        const cleanHandle = handle.replace('@', '');

        const newClub = await prisma.club.create({
            data: {
                name,
                handle: cleanHandle,
                description,
                logoUrl
            }
        });
        
        res.status(201).json({ message: "Club created", club: newClub });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "A club with this handle already exists" });
        }
        console.error("Error creating club:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Toggle follow un-follow a club
exports.toggleFollowClub = async (req, res) => {
    try {
        const userId = req.user.id;
        const clubId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { clubs: true }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found. Please log in again." });
        }

        const isFollowing = user.clubs.some(c => c.id === clubId);

        if (isFollowing) {
            // Unfollow
            await prisma.user.update({
                where: { id: userId },
                data: { clubs: { disconnect: { id: clubId } } }
            });
            return res.json({ message: "Unfollowed club successfully", followed: false });
        } else {
            // Follow
            await prisma.user.update({
                where: { id: userId },
                data: { clubs: { connect: { id: clubId } } }
            });
            return res.json({ message: "Followed club successfully", followed: true });
        }

    } catch (error) {
        console.error("Error toggling follow:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get clubs followed by the user
exports.getUserClubs = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { clubs: true }
        });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user.clubs);
    } catch (error) {
        console.error("Error fetching user clubs:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete a club
exports.deleteClub = async (req, res) => {
    try {
        const clubId = parseInt(req.params.id);
        
        // Delete related events first
        await prisma.event.deleteMany({
            where: { clubId }
        });
        
        // Delete the club (Prisma handles implicit many-to-many user relations)
        await prisma.club.delete({
            where: { id: clubId }
        });

        res.json({ message: "Club deleted successfully" });
    } catch (error) {
        console.error("Error deleting club:", error);
        res.status(500).json({ message: "Server error" });
    }
};
