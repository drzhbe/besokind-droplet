//
// Card data recording
//
const { pool, dbFailure, values } = require('./_db_common');

// const handleCard = (card) => {
//   return {
//     "author_id": card.authorId,
// 	"body": card.body,
// 	"city": card.city,
// 	"creation_time": card.creationTime,
// 	"creation_time_friendly": card.creationTimeFriendly,
// 	"status": card.status || 0
//   };
// };

class Rules {
	constructor() {
		this.rules = [];
	}

	date(prop, val) {
		this.rules.push({
			prop: prop,
			val: val,
			type: "date",
			errorText: `Property "${prop}" should be valid date`,
			ok: val instanceof Date && !isNaN(val.getTime())
		});
	}

	string(prop, val, maxLength) {
		this.rules.push({
			prop: prop,
			val: val,
			type: "string",
			maxLength: maxLength,
			errorText: `Property "${prop}" should be string less than ${maxLength} characters`,
			ok: val.length < maxLength
		});
	}

	check() {
		let notValidRules = this.rules.filter(rule => !rule.ok);
		if (notValidRules.length) {
			let errorString = notValidRules.reduce((result, rule) => result += `\n${rule.errorText}`, "");
			return {ok: false, error: errorString};
		} else {
			return {ok: true, error: ''};
		}
	}
}

const checkCard = (card) => {
	console.log('\n\ncard', typeof card, card, '\n\n');
	let requiredProps = [
		"body",
		"city",
		"creation_time",
		"creation_time_friendly"
	];
	// "body" character varying(2048),
	// "city" character varying(256),
	// "creation_time" timestamp without time zone,
	// "creation_time_friendly" character varying(256),
	// "karma" int,
	// "place" character varying(256),
	// "status" int,
	// "title" character varying(140)
	let rules = new Rules();
	rules.string("body", card.body, 2048);
	rules.string("city", card.city, 256);
	rules.string("creation_time_friendly", card.creation_time_friendly, 256);
	rules.date("creation_time", card.creation_time);
	let check = rules.check();

	let errorText = "";

	let missingProps = requiredProps.filter((prop) => !card[prop]);
	if (missingProps.length) {
		errorText += `\nProperties [${missingProps.join(', ')}] are missing`;
	}
	if (!check.ok) {
		errorText += check.error;
	}

	if (missingProps.length || !check.ok) {
		return {ok: false, error: errorText};
	} else {
		return {ok: true, error: ""};
	}
};

module.exports = {
	createCard: async function(card) {
		if (!card) {
			throw "To create a card you have to pass /a card/";
		}
		console.log('\n\ncard', typeof card, card, '\n\n');
		let check = checkCard(card);
		console.log('\n\ncheck', typeof check, check, '\n\n');
		if (!check.ok) {
			throw check.error;
		}

		let client = await pool.connect();
		await client.query('begin');

	    let id = await client.query(`
	      insert into "card"(
	        "author_id",
			"body",
			"city",
			"creation_time",
			"creation_time_friendly",
			"status")
	      values($1, $2, $3, $4, $5, $6)
	      returning "id"`,
	      values(card)
	    ).then((res) => res.rows[0].id, dbFailure);

	    await client.query('commit');
	    client.release();

	    return id;
	},

	getCards: async function(city) {
		let result = await pool.query(`
			select * from "card"
			where "city" = '${city}'
			order by "creation_time" desc
		`).then(res => res.rows, dbFailure);

		console.log('\n\n 1 db.getCards result', typeof result, result, '\n\n');

		return result;
	}
};
