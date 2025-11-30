const db = require('./models');

async function updateSignalStatuses() {
  try {
    // Update all PENDING signals to IN_PROGRESS
    const result = await db.Signal.update(
      { status: 'IN_PROGRESS' },
      { where: { status: 'PENDING' } }
    );
    
    console.log(`Updated ${result[0]} signals from PENDING to IN_PROGRESS`);
    
    // Update all CLOSED signals to LOSS (since we don't know if they were profit or loss)
    const closedResult = await db.Signal.update(
      { status: 'LOSS' },
      { where: { status: 'CLOSED' } }
    );
    
    console.log(`Updated ${closedResult[0]} signals from CLOSED to LOSS`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating signal statuses:', error);
    process.exit(1);
  }
}

updateSignalStatuses();