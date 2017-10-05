const pg = require('pg');

const common = require("./_db_common");
const user = require("./_db_user");
const card = require("./_db_card");
const session = require("./_db_session");

module.exports = Object.assign({}, common, user, card, session);
