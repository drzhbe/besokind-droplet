//
// User data recording
//
const { pool, dbFailure, values } = require('./_db_common');

const handleVkontakteUser = (user) => {
  return {
    "password": "",
    "provider": user.provider,
    "provider_id": user.id,
    "city": "",
    "email": "",
    "karma": 0,
    "name": user.displayName,
    "moderator": false,
    "last_online": new Date(),
    "photo_url": user.photos[0].value
  };
};

async function updateUser(uid, key, value) {
  let res = await pool.query(`
    update "user"
    set ${key} = '${value}'
    where "user"."id" = '${uid}'
  `).then((res) => 'ok', dbFailure);
  return res;
}

module.exports = {
  // Auth through an external provider returning user id,
  // possibly creating a new user record
  /*
    # VK
    user._json: {
      id: 5153117,
      first_name: 'Станислав',
      last_name: 'Сальников',
      sex: 2,
      screen_name: 'id5153117',
      photo: 'https://pp.userapi.com/c840126/v840126117/4db5/x8vsyyhXW90.jpg'
    }
  */
  connectUser: async function(user) {
    let providerId = user.id;
    if (providerId == null) {
      throw new TypeError('user id cannot be null');
    }

    // `user.username` is the callsign
    // `user.displayName` is the displayed name

    let client = await pool.connect();
    let res = await client.query(`
      select "id", "provider_id"
      from "user"
      where "provider_id" = $1
      limit 1`,
      [providerId]
    );

    if (res.rowCount > 0) {
      // user exists
      client.release();
      return res.rows[0].id;
    }

    let u = handleVkontakteUser(user);
    await client.query('begin');
    let id = await client.query(`
      insert into "user"(
        "password",
        "provider",
        "provider_id",
        "city",
        "email",
        "karma",
        "name",
        "moderator",
        "last_online",
        "photo_url")
      values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning "id"`,
      values(u)
    ).then((res) => res.rows[0].id, dbFailure);
    await client.query('commit');
    client.release();
    console.log(`\n\nUser created through ${u.provider} provider with ${u.provider_id} id.\nNew id: ${id}\n\n`)

    return id;
  },

  // Return user id by their session token,
  // null on stale or broken token
  userIdBySessionToken: async function(token) {
    return pool.query(`
      select "id"
      from "session"
      where "token" = $1
      limit 1`,
      [token]
    ).then((res) => {
      if (res.rowCount < 1) {
        return null;
      }

      let uid = res.rows[0].id;
      return uid;
    });
  },

  // Return all available info about this user
  getUser: async function(uid) {
    let res = await pool.query(`
      select
        "id",
        "city",
        "email",
        "karma",
        "name",
        "moderator",
        "last_online",
        "photo_url"
      from "user"
      where "user"."id" = $1
      limit 1`,
      [uid]
    );
    if (res.rowCount < 1) {
      return null;
    }

    return res.rows[0];
  },

  updateUserCity: async function(uid, city) {
    return await updateUser(uid, 'city', city);
  }
};

