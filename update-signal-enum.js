const db = require('./models');

async function updateSignalEnum() {
  try {
    // First, let's see what the current ENUM definition is
    const enumInfo = await db.sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Signals' 
      AND COLUMN_NAME = 'status'
      AND TABLE_SCHEMA = 'stockagent_db'
    `, {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log('Current ENUM definition:', enumInfo[0].COLUMN_TYPE);
    
    // Modify the ENUM to only have the 3 new statuses
    await db.sequelize.query(`
      ALTER TABLE Signals 
      MODIFY COLUMN status ENUM('IN_PROGRESS', 'PROFIT', 'LOSS') 
      NOT NULL DEFAULT 'IN_PROGRESS'
    `);
    
    console.log('Successfully updated ENUM definition');
    
    // Now update the existing data
    await db.sequelize.query(`
      UPDATE Signals 
      SET status = CASE 
        WHEN status IN ('PENDING', 'ACTIVE') THEN 'IN_PROGRESS'
        WHEN status IN ('CLOSED', 'EXPIRED') THEN 'LOSS'
        ELSE status
      END
    `);
    
    console.log('Successfully updated signal statuses');
    
    // Verify the update
    const updatedStatuses = await db.sequelize.query('SELECT DISTINCT status FROM Signals', {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log('Updated statuses in database:', updatedStatuses);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating signal enum:', error);
    process.exit(1);
  }
}

updateSignalEnum();