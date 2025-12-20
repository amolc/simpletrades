'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove all unique indexes on planName column
    const indexes = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Plans'
        AND COLUMN_NAME = 'planName'
        AND NON_UNIQUE = 0
    `, { type: Sequelize.QueryTypes.SELECT });

    for (const index of indexes) {
      await queryInterface.sequelize.query(`ALTER TABLE Plans DROP INDEX \`${index.INDEX_NAME}\``);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the unique index
    await queryInterface.sequelize.query('ALTER TABLE Plans ADD UNIQUE INDEX planName (planName)');
  }
};