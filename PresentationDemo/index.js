/* Get DOM elements */

var refreshButton = document.querySelector('.refresh');
var closeButton1 = document.querySelector('.close1');
var closeButton2 = document.querySelector('.close2');
var closeButton3 = document.querySelector('.close3');

/* Create observables from DOM element click-events */

var refreshClickStream = Rx.Observable.fromEvent(refreshButton, 'click');
var close1ClickStream = Rx.Observable.fromEvent(closeButton1, 'click');
var close2ClickStream = Rx.Observable.fromEvent(closeButton2, 'click');
var close3ClickStream = Rx.Observable.fromEvent(closeButton3, 'click');

/*
  StartWith operator emits a specified item or sequence of items before beginning to emit items from source observable.
  In this case, it starts with 'startup click'.
  Here we are creating an observable that observes our refreshClickStream, and everytime it sees a click,
  it returns a github user list with a random offset
*/
var requestStream = refreshClickStream.startWith('startup click')
    .map(function() {
        var randomOffset = Math.floor(Math.random()*500);
				console.log("Requesting " + 'https://api.github.com/users?since=' + randomOffset);
        return 'https://api.github.com/users?since=' + randomOffset;
    });

/*
  Here, we are taking the itmes emitted from the requestStream and flattening the emissions from those
  into a single observable which we call responseStream.
  So in effect, this allows us to make multiple outputs from requestStream and process them through a single observable.
*/

var responseStream = requestStream
    .flatMap(function (requestUrl) {
				console.log("Getting url for " + requestUrl);
        return Rx.Observable.fromPromise($.getJSON(requestUrl));
    });

/*
  Now since we want to have three separate suggestions at once, it would make sense to have a factory function that creates them for us.
  createSuggestionStream() takes as an argument an observable attached to a 'close button' click stream. That is the button we will use
  to manually refresh the suggestion, so it makes sense to build our new observable around that.
*/

function createSuggestionStream(closeClickStream) {
    return closeClickStream.startWith('startup click')   //Start by automating a click notification so that a signal activates this observable on startup
        .combineLatest(responseStream,       //When activated, this observable will take the most recent userList retrieved from responseStream, and return a random user
            function(click, listUsers) {
                return listUsers[Math.floor(Math.random()*listUsers.length)];
            }
        )
        .merge(
            refreshClickStream.map(function(){ //Since we want the refresh button to clear out the current suggestion,
                                               //we merge the data stream we just created with the refresh button data stream
                                               //to null suggestion data
                return null;
            })
        )
        .startWith(null);                      //Finally, we start with a nulled out (empty) suggestion.
                                               //So at the very start, a newly create suggestion stream will be empty
}

/*
  Now, using the factory we just created, we create 3 new suggestion streams
*/

var suggestion1Stream = createSuggestionStream(close1ClickStream);
var suggestion2Stream = createSuggestionStream(close2ClickStream);
var suggestion3Stream = createSuggestionStream(close3ClickStream);


// Rendering ---------------------------------------------------

/*
  Here, we simply take the data gathered from the observable and render
  it to the DOM. This function takes a suggested user sent through by the observable,
  pulls the username, avatar image, and link to their profile, and makes it all visible.
  If the user is null, it hides the whole element
*/

function renderSuggestion(suggestedUser, selector) {
    var suggestionEl = document.querySelector(selector);
    if (suggestedUser === null) {
        suggestionEl.style.visibility = 'hidden';
    } else {
        suggestionEl.style.visibility = 'visible';
        var usernameEl = suggestionEl.querySelector('.username');
        usernameEl.href = suggestedUser.html_url;
        usernameEl.textContent = suggestedUser.login;
        var imgEl = suggestionEl.querySelector('img');
        imgEl.src = "";
        imgEl.src = suggestedUser.avatar_url;
    }
}

/*
  Finally, to tie everything together, we create a subscription for each of the suggestion streams,
  which takes the data that comes through and renders it to the element on the page
*/

suggestion1Stream.subscribe(function (suggestedUser) {
		console.log("Rendering " + suggestedUser + " to suggestion1");
	  renderSuggestion(suggestedUser, '.suggestion1');
});

suggestion2Stream.subscribe(function (suggestedUser) {
    renderSuggestion(suggestedUser, '.suggestion2');
});

suggestion3Stream.subscribe(function (suggestedUser) {
    renderSuggestion(suggestedUser, '.suggestion3');
});
