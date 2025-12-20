require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./models');

async function updatePassword() {
  try {
    await db.sequelize.authenticate();
    console.log('Connected to database');
    const user = await db.User.findOne({ where: { phoneNumber: '9881400981' } });
    if (!user) {
      console.log('User not found');
      return;
    }
    const hashedPassword = await bcrypt.hash('ferrari1234', 10);
    user.password = hashedPassword;
    await user.save();
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.sequelize.close();
  }
}

updatePassword();