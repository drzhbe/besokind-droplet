var config = {
  apiKey: "AIzaSyBenkychYMdGWfGBnjpxDAeEzR9hu60_f0",
  authDomain: "besokind-b837c.firebaseapp.com",
  databaseURL: "https://besokind-b837c.firebaseio.com",
  storageBucket: "besokind-b837c.appspot.com",
  messagingSenderId: "490319737092"
};
firebase.initializeApp(config);

var auth = firebase.auth();
var database = firebase.database();
var dbCards = database.ref('cards');
dbCards.off();


function enableUserLoggedInSubscribes(user) {
  var userNotificationsRef = database.ref('user-notifications/' + user.uid);

  userNotificationsRef.limitToLast(12).on('child_added', notificationAdded);
  userNotificationsRef.on('child_removed', notificationRemoved);

  database.ref('user-rooms/' + user.uid)
    .limitToLast(12)
    .on('child_added', function(room) {
      app.ports.roomAdded.send({ id: room.key, users: [], messages: [] });

      database.ref('room-messages/' + room.key)
        .limitToLast(1)
        .on('child_added', function(im) {
          app.ports.messageAdded.send({chatId: room.key, im: im.val()});
        });
    });

  database.ref('users/' + user.uid)
    .child('lastOnline')
    .onDisconnect()
    .set(firebase.database.ServerValue.TIMESTAMP);

  database.ref('users-online')
    .child(user.uid)
    .onDisconnect()
    .remove();
}


function watchCards() {
  dbCards.limitToLast(1).on('child_added', addCardToList);
  dbCards.limitToLast(1).on('child_changed', updateCard);
}


function setUserPresence(isOnline) {
  if (auth.currentUser) {
    var updates = {};
    updates[auth.currentUser.uid] = isOnline ? true : null;
    database.ref('users-online')
      .update(updates)
      .then(function() {
        // body...
      })
      .catch(function(error) {
        console.error('## error during [setting user presence]:', error);
      });
  }
}


/*
  depends on `dateFnsDistanceInWords`
*/
function getCards(lastCardId) {
  // var ref = dbCards.limitToLast(12);
  var ref = dbCards.limitToLast(12);
  if (lastCardId) {
    ref = ref.endAt(null, lastCardId)
  }
  // ref = ref.orderByChild('city').equalTo()
  ref.once('value', function(snap) {
    var result = [];
    snap.forEach(function(snapItem) {
      var card = snapItem.val();
      card.creationTimeFriendly = dateFnsDistanceInWords(card.creationTime);
      result.unshift(card);
    });

    result.shift();

    app.ports.addCardsToList.send(result);
  });
}


auth.onAuthStateChanged(function(user) {
  if (!user) return;

  database.ref('users/' + user.uid).transaction(function(_user) {
    if (!_user) {
      // authorized for the first time -> create user
      _user = {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        karma: 0,
        moderator: false,
        city: ""
      };
    }
    if (DETECTED_CITY && _user.city !== DETECTED_CITY) {
      if (_user.city) {
        var change = confirm("Хотите сменить ваш город " + window.cities[_user.city] + " на " + window.cities[DETECTED_CITY] + "?");
        if (change) {
          _user.city = DETECTED_CITY;
        }
      } else {
        _user.city = DETECTED_CITY;
      }
    }
    setUserPresence(true);
    app.ports.authStateChanged.send(_user);
    enableUserLoggedInSubscribes(_user);
    return _user;
  });
});


app.ports.login.subscribe(function(authType) {
  switch (authType) {
    case 'google':
      auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      break;
  }
});


app.ports.logout.subscribe(function() {
  if (auth.currentUser) {
    var uid = auth.currentUser.uid;
    setUserPresence(false);
    database.ref('users/' + uid + '/lastOnline').set(firebase.database.ServerValue.TIMESTAMP);
    database.ref('user-notifications/' + uid).off();
    database.ref('user-rooms/' + uid).off();
  }

  auth.signOut();

  app.ports.authStateChanged.send({
    uid: '',
    name: '',
    email: '',
    photoURL: '',
    city: '',
    karma: 0,
    moderator: false
  });
});


// Город приходит на русском. В приложении есть только русский список
// port setCity : { userId : String, city : String } -> Cmd msg
app.ports.setCity.subscribe(function(o) {
  if (!o.userId) return;

  database.ref('users/' + o.userId)
    .transaction(function(user) {
      if (!user) return user;

      for (var transliteratedCity in window.cities) {
        if (o.city === window.cities[transliteratedCity]) {
          break;
        }
      }

      if (user.city !== transliteratedCity) {
        user.city = transliteratedCity;
      }

      app.ports.authStateChanged.send(user);

      return user;
    });
});


/*
  port fetchCardVolunteers : String -> Cmd msg
*/
app.ports.fetchCardVolunteers.subscribe(function(id) {
  database.ref('card-volunteers/' + id).once('value', function(snapshot) {
    var volunteers = [];
    snapshot.forEach(function(user) {
      volunteers.push(user.key);
      fetchUser({id: user.key, purpose: 'openCardPage'});
    });
    app.ports.cardVolunteersFetched.send(volunteers);
  });
});


app.ports.fetchCard.subscribe(function(id) {
  database.ref('cards/' + id).once('value', function(card) {
    card = card.val();
    card.creationTimeFriendly = dateFnsDistanceInWords(card.creationTime);
    app.ports.cardFetched.send(card);
  });
});


app.ports.fetchUserCards.subscribe(function(id) {
  dbCards.orderByChild('authorId').equalTo(id).once('value', function(snapshot) {
    var cards = [];
    snapshot.forEach(function(card) {
      card = card.val();
      card.creationTimeFriendly = dateFnsDistanceInWords(card.creationTime);
      cards.push(card);
    });
    app.ports.userCardsFetched.send(cards);
  });
});


app.ports.createCard.subscribe(function(card) {
  var updates = {};
  var cardId = dbCards.push().key;
  card.id = cardId;
  card.creationTime = +new Date();

  if (card.city) {
    var firstCharCode = card.city.charCodeAt(0);
    // 65 == A, 122 === z
    if (firstCharCode < 65 || firstCharCode > 122) {
      for (var transliteratedCity in window.cities) {
        if (card.city === window.cities[transliteratedCity]) {
          break;
        }
      }
      card.city = transliteratedCity;
    }
  }

  card.creationTimeFriendly = dateFnsDistanceInWords(card.creationTime);
  console.log('\n\ncard', typeof card, card, '\n\n');

  updates['/cards/' + cardId] = card;
  database.ref()
    .update(updates)
    .catch(function(error) {
      console.error('## error during [pushing card]:', card, error);
    });
});


/*
  port fetchUser : { id: String, purpose: String } -> Cmd msg
    o.purpose "openUserPage" | "openChatPage"
*/
app.ports.fetchUser.subscribe(fetchUser);


function fetchUser(o) {
  database.ref('users/' + o.id).once('value', function(snapshot) {
    var userInDb = snapshot.val();

    if (userInDb) {
      switch (o.purpose) {
        case 'openUserPage':
          app.ports.activeUserFetched.send(userInDb);
          break;
        case 'openChatPage':
        case 'openCardPage':
          app.ports.userFetched.send(userInDb);
          break;
      }
    }
  });
}


/*
  port fetchUserTakenCards : String -> Cmd msg
*/
app.ports.fetchUserTakenCards.subscribe(function(userId) {
  database.ref('user-taken-cards/' + userId).limitToLast(12).once('value', function(snapshot) {
    var cards = [];
    snapshot.forEach(function(card) {
      card = card.val();
      card.creationTimeFriendly = dateFnsDistanceInWords(card.creationTime);
      cards.push(card);
    });
    app.ports.userTakenCardsFetched.send(cards);
  });
});


/*
  port updateKarma : {authorId : String, cardId : String, karma : Int} -> Cmd msg
*/
app.ports.updateKarma.subscribe(function(o) {
  database.ref('cards/' + o.cardId)
    .transaction(function(card) {
      if (card) {
        card.karma = o.karma;
        if (card.status === 0) {
          card.status = 1;
        }
      }
      return card;
    })
    .catch(function(error) {
      console.error('## error during [updating karma]', o.karma, 'for card:', o.cardId, error);
    });
});


/*
  port takeCard : { user : User, card : Card } -> Cmd msg
*/
app.ports.takeCard.subscribe(function(o) {
  var updates = {};
  updates['card-volunteers/' + o.card.id + '/' + o.user.uid] = o.user;
  updates['user-taken-cards/' + o.user.uid + '/' + o.card.id] = true;
  var authorNotificationId = database.ref('user-notifications/' + o.card.authorId).push().key;
  updates['user-notifications/' + o.card.authorId + '/' + authorNotificationId] = {
    id: authorNotificationId,
    name: 'userTookCard',
    read: false,
    cardId: o.card.id,
    userId: o.user.uid,
    cardAuthorId: o.card.authorId,
    userName: o.user.name
  };
  database.ref()
    .update(updates)
    .then(function() {
      database.ref('card-volunteers/' + o.card.id).once('value', function(snapshot) {
      var volunteers = [];
      snapshot.forEach(function(user) {
        volunteers.push(user.key);
        fetchUser({id: user.key, purpose: 'openCardPage'});
      });
      app.ports.cardVolunteersFetched.send(volunteers);
    });
    })
    .catch(function(error) {
      console.error('## error during [adding volunteer]', o.user.uid, 'to card:', o.card.id, error);
    });
});


/*
  port removeCard : Card -> Cmd msg
*/
app.ports.removeCard.subscribe(function(card) {
  database.ref('card-volunteers/' + card.id).once('value', function(snapshot) {
    var updates = {};
    updates['cards/' + card.id] = null;
    updates['card-volunteers/' + card.id] = null;
    snapshot.forEach(function(volunteerId) {
      updates['user-taken-cards/' + volunteer.key + '/' + card.id] = null;
    });
    database.ref()
      .update(updates)
      .then(function() {
        // card removed
        app.ports.cardRemoved.send(card);
      })
      .catch(function(error) {
        console.error('## error during [removing card]:', card.id, error);
      });
  });
});


function createRoom(roomId, authorId, volunteerId, cardAuthorName) {
  var roomExists = false;

  var updates = {};
  updates['room-metadata/' + roomId + '/users/' + authorId] = true;
  updates['room-metadata/' + roomId + '/users/' + volunteerId] = true;
  updates['user-rooms/' + authorId + '/' + roomId] = true;
  updates['user-rooms/' + volunteerId + '/' + roomId] = true;
  var volunteerNotificationId = database.ref('user-notifications/' + volunteerId).push().key;
  updates['user-notifications/' + volunteerId + '/' + volunteerNotificationId] = {
    id: volunteerNotificationId,
    name: 'userAssignedToCard',
    read: false,
    cardId: roomId,
    userId: volunteerId,
    cardAuthorId: authorId,
    userName: cardAuthorName
  };

  database.ref()
    .update(updates)
    .then(function() {
      
    })
    .catch(function(error) {
      console.error('## error during [creating room]:', roomId, 'for users:', authorId, volunteerId, error);
    });
}


/*
  port assignVolunteer : { card : Card, user : User, userName : String } -> Cmd msg
*/
app.ports.assignVolunteer.subscribe(function(o) {
  var updates = {};

  database.ref('card-volunteers/' + o.card.id).once('value', function(snapshot) {

    updates['cards/' + o.card.id + '/assignedTo'] = o.user.uid;
    updates['cards/' + o.card.id + '/assignedAt'] = firebase.database.ServerValue.TIMESTAMP;
    // updates['rooms/']

    database.ref()
      .update(updates)
      .then(function() {
        createRoom(o.card.id, o.card.authorId, o.user.uid, o.userName);
      })
      .catch(function(error) {
        console.error('## error during [assigning volunteer]:', o.user.uid, 'for card:', o.card.id, error);
      });
  });
});

app.ports.confirmHelp.subscribe(function(card) {
  var updates = {};

  database.ref('card-volunteers/' + card.id).once('value', function(snapshot) {

    updates['cards/' + card.id + '/status'] = 2;


    database.ref()
      .update(updates)
      .then(function() {
        // update user karma
        database.ref('users/' + card.assignedTo)
          .transaction(function(user) {
            if (user) {
              user.karma = user.karma + card.karma;
            }
            return user;
          });

        // create notifications for each volunteer
        var updates = {};
        snapshot.forEach(function(volunteer) {
          var volunteerId = volunteer.key;
          var volunteerNotificationId = database.ref('user-notifications/' + volunteerId).push().key;
          updates['user-notifications/' + volunteerId + '/' + volunteerNotificationId] = {
            id: volunteerNotificationId,
            name: 'helpConfirmed',
            read: false,
            cardId: card.id,
            userId: card.assignedTo,
            cardAuthorId: card.authorId,
            userName: card.authorName
          };
        });
        database.ref()
          .update(updates)
          .then(function() {})
          .catch(function(error) {
            console.error('## error during [creating helpConfirmed notifications]: for card:', card, error);
          });

        // update card in application
        database.ref('cards/' + card.id).once('value', function(snap) {
          app.ports.updateCard.send(snap.val());
        });
      })
      .catch(function(error) {
        console.error('## error during [confirming help]: for card:', card, error);
      });
  });
});

/*
  port markNotificationsAsRead : { userId : String, notificationIdList : List String } -> Cmd msg
*/
app.ports.markNotificationsAsRead.subscribe(function(o) {
  var updates = {};
  o.notificationIdList.forEach(function(notificationId) {
    updates['user-notifications/' + o.userId + '/' + notificationId + '/read'] = true;
  });
  database.ref()
    .update(updates)
    .then(function() {})
    .catch(function(error) {
      console.error('## error during [marking notifications as read]:', o.notificationIdList, 'for user:', o.userId, error);
    });
});

app.ports.persistCardText.subscribe(function(cardText) {
  if (!window.localStorage) return;
  localStorage.setItem('cardText', cardText);
});

if (window.localStorage) {
  var cardText = localStorage.getItem('cardText');
  if (cardText) {
    app.ports.cardTextFetched.send(cardText);
  }
}

database.ref('users-online').on('child_added', function(snapshot) {
  app.ports.onlineUserAdded.send(snapshot.key);
});
database.ref('users-online').on('child_removed', function(snapshot) {
  app.ports.onlineUserRemoved.send(snapshot.key);
});




