const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client'); // Import the bridge we made in Step 1

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // 1. Validation (Moved from the old User.js model)
        if (!email.endsWith('@nitk.edu.in')) {
            return res.status(400).json({ error: "Only NITK emails are allowed." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create User (Prisma Syntax)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'student' // Prisma handles the Enum check automatically
            }
        });

        res.status(201).json({ message: "Student registered!", userId: user.id });

    } catch (error) {
        // Prisma Error Code P2002 = Unique Constraint Violation (Duplicate Email)
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 3. Find User (Prisma Syntax)
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );
            res.json({ token, role: user.role });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
};