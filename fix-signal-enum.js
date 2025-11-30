const db = require('./models');

async function fixSignalEnum() {
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
    
    // Step 1: Update existing data to use only valid statuses that will exist in the new ENUM
    await db.sequelize.query(`
      UPDATE Signals 
      SET status = CASE 
        WHEN status = 'PENDING' THEN 'IN_PROGRESS'
        WHEN status = 'ACTIVE' THEN 'IN_PROGRESS'
        WHEN status = 'CLOSED' THEN 'LOSS'
        ELSE 'IN_PROGRESS'
      END
    `);
    
    console.log('Successfully updated existing data');
    
    // Step 2: Modify the ENUM to only have the 3 new statuses
    await db.sequelize.query(`
      ALTER TABLE Signals 
      MODIFY COLUMN status ENUM('IN_PROGRESS', 'PROFIT', 'LOSS') 
      NOT NULL DEFAULT 'IN_PROGRESS'
    `);
    
    console.log('Successfully updated ENUM definition');
    
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

fixSignalEnum();