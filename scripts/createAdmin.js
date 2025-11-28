const bcrypt = require('bcryptjs')
const db = require('../models')

async function run() {
  try {
    const email = 'admin@demo.com'
    const password = 'admin123'
    const phoneNumber = '0000000000'

    const existing = await db.User.findOne({ where: { email } })
    const hashed = await bcrypt.hash(password, 10)

    if (existing) {
      existing.password = hashed
      existing.userType = 'staff'
      existing.role = 'admin'
      if (!existing.phoneNumber) existing.phoneNumber = phoneNumber
      await existing.save()
      console.log(`Updated existing admin user: ${email}`)
    } else {
      await db.User.create({
        email,
        phoneNumber,
        password: hashed,
        fullName: 'Admin',
        userType: 'staff',
        role: 'admin',
        status: 'active'
      })
      console.log(`Created admin user: ${email}`)
    }
  } catch (err) {
    console.error('Error creating admin:', err)
    process.exitCode = 1
  } finally {
    try { await db.sequelize.close() } catch {}
  }
}

run()
