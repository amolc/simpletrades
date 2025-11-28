'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add userType column
    await queryInterface.addColumn('Users', 'userType', {
      type: Sequelize.ENUM('customer', 'staff'),
      defaultValue: 'customer',
      allowNull: false
    });

    // Add status column
    await queryInterface.addColumn('Users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
      allowNull: false
    });

    // Add fullName column
    await queryInterface.addColumn('Users', 'fullName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Update existing users to have userType based on role
    await queryInterface.sequelize.query(`
      UPDATE Users 
      SET userType = CASE 
        WHEN role = 'admin' THEN 'staff'
        ELSE 'customer'
      END
    `);

    // Add unique constraint to phoneNumber
    await queryInterface.addConstraint('Users', {
      fields: ['phoneNumber'],
      type: 'unique',
      name: 'users_phoneNumber_unique'
    });

    // Add unique constraint to email (only for non-null values)
    await queryInterface.addConstraint('Users', {
      fields: ['email'],
      type: 'unique',
      name: 'users_email_unique',
      where: { email: { [Sequelize.Op.ne]: null } }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove constraints
    await queryInterface.removeConstraint('Users', 'users_phoneNumber_unique');
    await queryInterface.removeConstraint('Users', 'users_email_unique');

    // Remove columns
    await queryInterface.removeColumn('Users', 'userType');
    await queryInterface.removeColumn('Users', 'status');
    await queryInterface.removeColumn('Users', 'fullName');
  }
};