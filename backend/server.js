require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/User');
const authRoutes = require('./routes/auth'); // You'll create this to link controllers
const aiRoutes = require('./routes/ai');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/ai', aiRoutes);

// Sync Database (Like 'hbm2ddl.auto=update')
sequelize.sync().then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Backend running on port ${process.env.PORT}`);
    });
});