require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true // Allows execution of multiple SQL statements
});

const dbName = process.env.DB_NAME || 'stockagent_db';

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL server:', err.stack);
        return;
    }
    console.log('Connected to MySQL server.');

    connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`, (error) => {
        if (error) {
            console.error('Error creating database:', error);
            connection.release();
            return;
        }
        console.log(`Database '${dbName}' created or already exists.`);
        connection.changeUser({database: dbName}, (err) => {
            if (err) {
                console.error('Error changing to database:', err);
                connection.release();
                return;
            }
            console.log(`Switched to database '${dbName}'.`);
            connection.release();
            // Now proceed with reading and executing db.sql
            executeDbSql();
        });
    });
});

function executeDbSql() {
    const dbSqlPath = path.join(__dirname, 'db.sql');
    const subscriptionSqlPath = path.join(__dirname, 'subscription.sql');

    fs.readFile(dbSqlPath, 'utf8', (err, sql) => {
        if (err) {
            console.error('Error reading db.sql:', err);
            return;
        }

        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error connecting to the database:', err.stack);
                return;
            }
            console.log('Connected to the database.');

            connection.query(sql, (error) => {
                if (error) {
                    console.error('Error executing db.sql:', error);
                    connection.release();
                    return;
                }
                console.log('db.sql executed successfully. Users table created/verified.');

                fs.readFile(subscriptionSqlPath, 'utf8', (err, subscriptionSql) => {
                    if (err) {
                        console.error('Error reading subscription.sql:', err);
                        connection.release();
                        return;
                    }

                    connection.query(subscriptionSql, (error) => {
                        connection.release();
                        if (error) {
                            console.error('Error executing subscription.sql:', error);
                            return;
                        }
                        console.log('subscription.sql executed successfully. Subscriptions table created/verified.');
                        process.exit(0);
                    });
                });
            });
        });
    });
}