// amoore

$(function () {
    var twitterQueue = new TwitterQueue();
});

var TwitterQueue = function () {

    var append_new_messages = function (newTweets, source) {
        newTweetListItems = $.map(newTweets, function (tweet) { return tweetCreator.create_tweet_listitem(tweet, source); });
        $('#twitter ul').append(newTweetListItems.join(''))
    };

    var initialize_first_tweets = function () {
        tweets = $('#twitter ul li');
        tweets.first().addClass('active').fadeIn(700);
        tweets.last().addClass('end');
        start_interval();

        // Setup for regular mode
        twitterGetter = new TwitterGetter(append_new_messages);
        twitterGetter.get_new_tweets();
    };

    var fail_remove_twitter_div = function () {
        $('#twitter').slideUp(700, function () {
            $(this).remove();
        });
    };

    var intervalId;
    // Setup for initialize mode
    var twitterGetter = new TwitterGetter(append_new_messages, initialize_first_tweets, fail_remove_twitter_div);
    var tweetCreator = new TweetCreator();
    twitterGetter.get_new_tweets();

    function next_tweet() {
        var current = $('#twitter ul li.active');

        if (current.hasClass('end')) {
            stop_interval();
            $('#twitter ul li:last').addClass('end');
            twitterGetter.get_new_tweets();
            start_interval();
        }

        var next = current.next();

        current.fadeOut(700, function () {
            $(this).remove();
        });
        next.addClass('active');
        next.fadeIn(1000);

    }

    function start_interval() {
        intervalId = setInterval(next_tweet, 7500);
    }

    function stop_interval() {
        clearInterval(intervalId);
    }
}

var TwitterGetter = function (appendActionIn, loadFinishedActionIn, loadFailActionIn) {

    var feedsToLoad = [
                            { url: 'http://search.twitter.com/search.json?q=%23stirtrek&rpp=5', source: 'hashtags' },
                            { url: 'http://search.twitter.com/search.json?q=%40stirtrek&rpp=5', source: 'replies' },
                            { url: 'http://api.twitter.com/1/statuses/user_timeline.json?screen_name=stirtrek&count=5', source: 'status' }
                      ];

    var appendAction = appendActionIn;
    var loadFinishedAction = loadFinishedActionIn;
    var loadFailAction = loadFailActionIn;
    var loadSemaphore = 0;
    var loadTimeoutId = null;
    var currentAjaxRequests = [];


    this.get_new_tweets = function () {
        $.each(feedsToLoad, function (i, feedInfo) { load_feed(feedInfo); });
        loadTimeoutId = setTimeout(load_timeout_action, 3000);
    };

    function load_feed(feedInfo) {
        var request =
            $.ajax({
                url: feedInfo.url,
                dataType: 'jsonp',
                success: function (data, textStatus, jqXHR) {
                    var results = data.results || data;
                    appendAction(results, feedInfo.source);
                },
                complete: function (jqXHR, textStatus) {
                    if (loadFinishedAction == null) {
                        return;
                    }

                    loadSemaphore++;

                    if (loadSemaphore == feedsToLoad.length) {
                        clearTimeout(loadTimeoutId);
                        loadSemaphore = 0;
                        loadFinishedAction();
                    }
                }
            });
        currentAjaxRequests.push(request);
    };

    var load_timeout_action = function () {
        
        clearTimeout(loadTimeoutId);
        
        if (loadFinishedAction == null) {
            // No Load-Finished Action, do nothing
            return;
        }

        if (loadSemaphore == 0) {
            // We failed, cancel the requests and run the fail action
            $.each(currentAjaxRequests, function (i, request) { request.abort(); });
            loadFailAction();
            return;
        }

        // Just show what we have then
        loadSemaphore = 0;
        loadFinishedAction();
    };
};

var TweetCreator = function () {
    String.prototype.chat_string_create_urls = function () {
        return this.replace(/(ftp|http|https|file):\/\/[\S]+(\b|$)/gim, '<a href="$&" class="my_link" target="_blank">$&</a>')
                   .replace(/([^\/])(www[\S]+(\b|$))/gim, '$1<a href="http://$2" class="my_link" target="_blank">$2</a>');
    }

    // Borrowed from http://granades.com/2009/04/06/using-regular-expressions-to-match-twitter-users-and-hashtags/
    String.prototype.linkify_tweet = function () {
        var tweet = this.replace(/(^|\s)@(\w+)/g, '$1@<a href="http://www.twitter.com/$2">$2</a>');
        return tweet.replace(/(^|\s)#(\w+)/g, '$1#<a href="http://search.twitter.com/search?q=%23$2">$2</a>');
    };

    this.create_tweet_listitem = function (tweet, source) {
        tweetHTML = create_tweet_body(tweet, source) + create_tweet_signature(tweet);
        return '<li class="' + source + '">' + tweetHTML + '</li>';
    };

    function create_tweet_body(tweet, source) {
        tweet_body = tweet.text.chat_string_create_urls().linkify_tweet();
        return '<p><span class="open-quote">"</span>' + tweet_body + '<span class="close-quote">"</span></p>';
    }

    function create_tweet_signature(tweet) {

        tweetDate = new Date(tweet.created_at);
        tweetDateString = tweetDate.getMonth() + 1 + '/' + tweetDate.getDate() + '/' + tweetDate.getFullYear();
        fromUser = tweet.from_user || tweet.user.screen_name;

        return '<span class="username">&#151; ' +
                create_user_link(fromUser) +
                ' ' + tweetDateString + '</span>';
    }

    function create_user_link(username) {
        return '<a href="http://www.twitter.com/' + username + '" target="_blank">@' + username + '</a>';
    }

};


