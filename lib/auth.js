const passport = require('passport');
const VKStrategy = require('passport-vkontakte').Strategy;

const db = require('./db');

passport.use(new VKStrategy(
	{
		clientID: process.env.VK_APP_ID,
		clientSecret: process.env.VK_APP_SECRET,
		callbackURL:  process.env.DEBUG
			? `${process.env.HOST}:${process.env.PORT}/auth/vkontakte/callback`
			:  `https://besokind.ru/auth/vkontakte/callback`
	},
	function myVerifyCallback(accessToken, refreshToken, params, profile, done) {
		console.log('profile ::', typeof profile, profile);
		done(null, profile);
	}
));

passport.serializeUser((user, done) => {
	db.connectUser(user).then((uid) => {
		console.log('\n\nuid serialized user ::', typeof uid, uid, '\n\n');
		done(null, uid);
	}).catch((error) => {
		console.error('error in serializeUser [auth.connectUser]:', error);
		done(error, null);
	});
});

passport.deserializeUser((id, done) => {
	db.getUser(id).then((user) => {
		console.log('\n\nuser deserialized ::', typeof user, user, '\n\n');
		done(null, user);
	}).catch((error) => {
		console.error('error in deserializeUser [auth.getUser]:', error);
		done(error, null);
	});
});

module.exports = passport;
