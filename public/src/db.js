var db = {
	toApp: {
		user: fromDbToAppConvertUser,
		card: fromDbToAppConvertCard
	}
};

/*
type alias User =
  { uid : String
  , name : String
  , email : String
  , photoURL : String
  , karma: Int
  , moderator : Bool
  , city : String
  }

CREATE TABLE "user" (
  "id" uuid primary key not null default uuid_generate_v4(),
  "password" bytea,
  "provider" character varying(256),
  "provider_id" character varying(256),
  "city" character varying(256),
  "email" character varying(256),
  "karma" int,
  "name" character varying(256),
  "moderator" boolean,
  "last_online" timestamp without time zone,
  "photo_url" character varying(256)
);
*/
function fromDbToAppConvertUser(user) {
return {
  uid: user.id,
  name: user.name || "",
  email: user.email || "",
  photoURL: user.photo_url || "",
  karma: user.karma || 0,
  moderator: user.moderator || false,
  city: user.city || ""
};
}


/*
type alias Card =
  { id : String
  , status : CardStatus
  , authorId : String
  , authorName : String
  , authorPhotoURL : String
  , creationTime : Float
  , creationTimeFriendly : String
  , karma : Int
  , city : String
  , place : String
  , title : String
  , body : String
  , assignedTo : String
  , assignedAt : Float
  }

CREATE TABLE "card" (
  "id" uuid primary key not null default uuid_generate_v4(),
  "author_id" uuid not null references "user"("id"),
  "assigned_to" uuid references "user"("id"),
  "assigned_at" timestamp without time zone,
  "body" character varying(2048),
  "city" character varying(256),
  "creation_time" timestamp without time zone,
  "creation_time_friendly" character varying(256),
  "karma" int,
  "place" character varying(256),
  "status" int,
  "title" character varying(140)
);
*/
function fromDbToAppConvertCard(card) {
return {
  id: card.id,
  status: card.status || 0,
  authorId: card.author_id || "",
  authorName: card.author_name || "",
  authorPhotoURL: card.author_photo_url || "",
  assignedTo: card.assigned_to || "",
  assignedAt: card.assigned_at || 0,
  creationTime: card.creation_time || "",
  creationTimeFriendly: card.creation_time_friendly || "",
  karma: card.karma || 0,
  city: card.city || "",
  place: card.place || "",
  title: card.title || "",
  body: card.body || ""
};
}