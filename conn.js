const mysql = require("mysql");
const util = require("util");
require("dotenv").config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "a2z_ecom",
    port: process.env.DB_PORT || 3306
});

conn.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully");
});

const exe = util.promisify(conn.query).bind(conn);

module.exports = exe;