const db = require('./models');

async function fixSignalEnum() {
  try {
    console.log('Starting signal ENUM fix...');
    
    // Step 1: Temporarily add new statuses to ENUM
    console.log('Step 1: Temporarily adding new statuses to ENUM...');
    await db.sequelize.query(`
      ALTER TABLE Signals 
      MODIFY COLUMN status ENUM('PENDING','ACTIVE','CLOSED','IN_PROGRESS','PROFIT','LOSS') 
      NOT NULL DEFAULT 'IN_PROGRESS'
    `);
    console.log('✓ Temporarily added new statuses to ENUM');
    
    // Step 2: Update existing data
    console.log('Step 2: Updating existing signal statuses...');
    await db.sequelize.query(`
      UPDATE Signals 
      SET status = CASE 
        WHEN status = 'PENDING' THEN 'IN_PROGRESS'
        WHEN status = 'ACTIVE' THEN 'IN_PROGRESS'
        WHEN status = 'CLOSED' THEN 'LOSS'
        ELSE 'IN_PROGRESS'
      END
    `);
    console.log('✓ Updated signal statuses');
    
    // Step 3: Remove old statuses from ENUM
    console.log('Step 3: Removing old statuses from ENUM...');
    await db.sequelize.query(`
      ALTER TABLE Signals 
      MODIFY COLUMN status ENUM('IN_PROGRESS','PROFIT','LOSS') 
      NOT NULL DEFAULT 'IN_PROGRESS'
    `);
    console.log('✓ Removed old statuses from ENUM');
    
    console.log('Signal ENUM fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing signal ENUM:', error);
    process.exit(1);
  }
}

fixSignalEnum();