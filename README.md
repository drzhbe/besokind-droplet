# besokind-droplet
1. [Intro](#intro)
2. [Goal](#goal)
3. [Current situation](#current-situation)
4. [Usage](#usage)
4. [Install](#install)

## Intro
It is a server for besokind.ru. The client is placed in another repo [besokind-elm](https://github.com/drzhbe/besokind-elm).

Earlier besokind.ru was hosted on `firebase`, we used it's database, auth and hosting capabilities. But when we started to develop different cities, we understood that multi-field searches would be pain, escpecially when we'll start to implement search filters.

The second reason why we move from firebase is the time gap at the start of the application. I still don't know how to beat this lag, looks like it is 1 second to establish websocket and about 5-10 second to auth through social medias.

## Goal
So the main goal of this repo for now is to implement every firebase database interaction we use in [beta.html](https://github.com/drzhbe/besokind-elm/blob/master/public/beta.html).

## Current situation
We have methods
* /auth
* /getUser
* /setUserCity
* /createCard
* /feed

## Usage

After you make sure [Install](#install) section is done, you can start to develop. To run server use `npm start` command and in a browser go to `2bekind.ru:3000/beta` to be able to auth through vk.

Don't forget to add `/beta` to the path because at `/` we server welcome page.

`/beta` serves the file `public/beta.html` which comes from [besokind-elm](https://github.com/drzhbe/besokind-elm) repo. `public/src/app.js` is also compiled `besokind-elm` app.

When I develop API I usually test it on the actual frontend. So I have a `bsk-prepare` function in my `~/.bashrc`
```
bsk-prepare () {
  cp /Users/drzhbe/prj/besokind-elm/public/beta.html /Users/drzhbe/prj/besokind-droplet/public/beta.html;
  cp /Users/drzhbe/prj/besokind-elm/public/src/app.js /Users/drzhbe/prj/besokind-droplet/public/src/app.js;
}
```

I know that's not comfortable to have these 2 repos. I'll figure out soon how to make it more comfortable.

## Install

### .env
In root folder create a file `.env` with contents:
```
HOST=http://2bekind.ru
PORT=3000
HTTPS_PORT=8443
SESSION_SECRET=asdasd
PGUSER=
PGDATABASE=besokind
PGPASSWORD=
VK_APP_ID=6080656
VK_APP_SECRET=F9Q3xOgyx6dCN9N1HjaX
DEBUG=1
```
Where you should fill `PGUSER` and `PGPASSWORD` env variables.

### database
First of all you have to install postgresql if it's not installed yet. After that execute `tables.sql` from the root directory:
```
psql -U username -d besokind -a -f tables.sql
```

### /etc/hosts
To use vk authorization you have to add to `/etc/hosts` a line `127.0.0.1 2bekind.ru`
```
echo "127.0.0.1 2bekind.ru" >> /etc/hosts
```
