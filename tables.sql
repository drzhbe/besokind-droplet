create extension if not exists "uuid-ossp";

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

CREATE TABLE "card" (
	"id" uuid primary key not null default uuid_generate_v4(),
	"author_id" uuid not null references "user"("id"),
	"author_name" character varying(256),
	"author_photo_url" character varying(256),
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

CREATE TABLE "session" (
  "user_id" uuid null references "user"("id"),
  "token" character varying(48) primary key not null default uuid_generate_v4(),
  "timestamp" timestamp without time zone not null default now(),
  "associated_data" jsonb not null default '{}'::jsonb
);
