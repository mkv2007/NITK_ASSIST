const jwt = require('jsonwebtoken');

module.exports = (roles = []) => {
    return (req, res, next) => {
        // System bypass for automation worker
        if (req.headers['x-api-key'] === process.env.SYSTEM_API_KEY) {
            req.user = { id: 0, role: 'admin' };
            return next();
        }

        // Get token from header (Format: Bearer <token>)
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: "Access Denied: No token provided" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Role-based check (e.g., if 'admin' is required)
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Access Denied: Insufficient permissions" });
            }
            
            next();
        } catch (err) {
            res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};