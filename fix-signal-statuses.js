const db = require('./models');

async function fixSignalStatuses() {
  try {
    // First, let's see what statuses we have
    const currentStatuses = await db.sequelize.query('SELECT DISTINCT status FROM Signals', {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log('Current statuses in database:', currentStatuses);
    
    // Update PENDING to IN_PROGRESS
    await db.sequelize.query(`
      UPDATE Signals 
      SET status = 'IN_PROGRESS', updatedAt = NOW()
      WHERE status = 'PENDING'
    `);
    
    // Update CLOSED to LOSS
    await db.sequelize.query(`
      UPDATE Signals 
      SET status = 'LOSS', updatedAt = NOW()
      WHERE status = 'CLOSED'
    `);
    
    console.log('Successfully updated signal statuses');
    
    // Verify the update
    const updatedStatuses = await db.sequelize.query('SELECT DISTINCT status FROM Signals', {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log('Updated statuses in database:', updatedStatuses);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating signal statuses:', error);
    process.exit(1);
  }
}

fixSignalStatuses();