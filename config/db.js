require('dotenv').config(); // Load environment variables
const mysql = require('mysql2/promise'); // Using promise-based API

// Build MySQL connection configuration with support for DATABASE_URL and optional SSL
const buildMysqlConfig = () => {
	const { DATABASE_URL, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_ENABLE_SSL } = process.env;

	let config;
	let usingUrl = false;

	if (DATABASE_URL) {
		config = DATABASE_URL; // mysql2 supports a URL string directly
		usingUrl = true;
	} else {
		config = {
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			database: DB_NAME,
			port: DB_PORT ? Number(DB_PORT) : undefined,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		};
	}

	// Determine if SSL should be enabled
	const enableSsl = String(DB_ENABLE_SSL || '').toLowerCase() === 'true' ||
		(usingUrl && /[?&](ssl|sslmode)=?(true|require)/i.test(DATABASE_URL));

	if (!usingUrl) {
		if (enableSsl) {
			config.ssl = { rejectUnauthorized: true };
		}
	} else {
		// When using URL, we can't mutate the string to add SSL. Users should include ssl params in the URL.
		// Nothing to do here besides masked logging below.
	}

	// Masked logging of effective config for debugging (avoid secrets)
	try {
		const mask = (val) => {
			if (!val) return undefined;
			const s = String(val);
			if (s.length <= 2) return '***';
			return s[0] + '***' + s[s.length - 1];
		};
		const effective = usingUrl
			? { via: 'DATABASE_URL', ssl: enableSsl }
			: {
				via: 'FIELDS',
				host: DB_HOST,
				port: DB_PORT ? Number(DB_PORT) : undefined,
				user: mask(DB_USER),
				database: DB_NAME,
				ssl: enableSsl
			};
		console.log('DB connection config (masked):', effective);
	} catch (_) {
		// noop
	}

	return config;
};

const pool = mysql.createPool(buildMysqlConfig());

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database!');
        connection.release(); 
    })
    .catch(err => {
        console.error('Error connecting to the database:', err.message);
        console.log('Server will continue running without database connection for testing...');
        // Don't crash the server, just log the error
        // process.exit(1); // Commented out to allow server to continue
    });

module.exports = pool; 