const bcrypt = require('bcryptjs')
const db = require('../models')

async function run(){
  try{
    await db.sequelize.authenticate()
    const qi = db.sequelize.getQueryInterface()
    const tables = await qi.showAllTables()
    // Drop legacy lowercase table if present
    if (tables.includes('users')){
      await qi.dropTable('users')
      console.log('Dropped legacy table: users')
    }
    // Null out FK references to Users
    await db.Signal.update({ userId: null }, { where: {} })
    await db.Subscription.update({ userId: null }, { where: {} })
    // Ensure Users exists and columns present
    await db.User.sync()
    const desc = await qi.describeTable('Users')
    const addIfMissing = async (name, opts)=>{ if(!desc[name]) { await qi.addColumn('Users', name, opts); console.log('Added column Users.'+name) } }
    await addIfMissing('fullName', { type: db.Sequelize.STRING, allowNull: true })
    await addIfMissing('userType', { type: db.Sequelize.ENUM('customer','staff'), allowNull: false, defaultValue: 'customer' })
    await addIfMissing('role', { type: db.Sequelize.STRING, allowNull: false, defaultValue: 'user' })
    await addIfMissing('status', { type: db.Sequelize.ENUM('active','inactive','suspended'), allowNull: false, defaultValue: 'active' })
    await addIfMissing('telegramId', { type: db.Sequelize.STRING, allowNull: true })
    await addIfMissing('whatsappNumber', { type: db.Sequelize.STRING, allowNull: true })
    await addIfMissing('preferredAlertMethod', { type: db.Sequelize.STRING, allowNull: true })
    await db.User.destroy({ where: {} })
    console.log('Cleared table: Users')
    // Seed single admin
    const email = 'admin@demo.com'
    const password = 'admin123'
    const hashed = await bcrypt.hash(password, 10)
    const user = await db.User.create({
      email,
      password: hashed,
      fullName: 'Admin',
      phoneNumber: null,
      userType: 'staff',
      role: 'admin',
      status: 'active'
    })
    console.log('Created admin user:', email)
    process.exit(0)
  }catch(e){
    console.error('Reset users error:', e)
    process.exit(1)
  }
}

run()
