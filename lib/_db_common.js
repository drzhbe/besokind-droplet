//
// Parts reusable across db submodules
//
const pg = require('pg');
const url = require('url');

// Crash because of db error
module.exports.dbFailure = (error) => {
  console.error('db failure:', error.message, error.stack);
  process.exit(33);
};

// create a config to configure both pooling behavior
// and client options
// note: all config is optional and the environment variables
// will be read if the config is not present
const config = {
  // user: 'foo', //env var: PGUSER
  // database: 'my_db', //env var: PGDATABASE
  // password: 'secret', //env var: PGPASSWORD
  host: 'localhost', // Server hosting the postgres database
  port: 5432, //env var: PGPORT
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 15000, // how long a client is allowed to remain idle before being closed
};

let pool = new pg.Pool(config);
module.exports.pool = pool;
// (callback)
module.exports.connect = pool.connect.bind(pool);
// (text, values, callback)
module.exports.query = pool.query.bind(pool)

// Preflight smoketest
module.exports.check = (done) => {
  pool.query('select true as answer', (error, re) => {
    if (error != null) {
      done(error);
      return;
    }

    let { answer } = re.rows[0];
    if (answer !== true) {
      done(new Error(`db failure: expected true to be returned from db; got ${ answer }`));
      return;
    }

    done(null);
  });
};

module.exports.values = (o) => {
  let result = [];
  for (let key in o) {
    result.push(o[key]);
  }
  return result;
};
