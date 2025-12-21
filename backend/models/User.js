require('dotenv').config(); // 1. Ensure env vars are loaded BEFORE the connection
const { Sequelize, DataTypes } = require('sequelize');

// 2. Double-check these names match your .env keys exactly
const sequelize = new Sequelize(
    process.env.DB_NAME || 'nitk_assist', 
    process.env.DB_USER || 'root', 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false // Keeps your terminal clean from SQL logs
    }
);

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            isNitkEmail(value) {
                // Strictly enforces the requirement from your project pitch
                if (!value.endsWith('@nitk.edu.in')) {
                    throw new Error('Only NITK emails are allowed.');
                }
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('student', 'admin'),
        defaultValue: 'student'
    }
}, {
    timestamps: true // Useful for tracking when students register
});

module.exports = { sequelize, User };