.pragma library

var STAGING = "http://staging-dir.boxee.tv:80"
var PRODUCTION = "http://dir.boxee.tv";

var host = PRODUCTION;

// device/user auth
var deviceId = null;
var userAuthToken = null;
var isAssociated = false;

// pandora status
var status = 1;

// current station & track
var currentTrack = null;
var currentStation = null;

// track & station storage
var stationList = [];
var playedTracks = {};
var skippedTracks = {};
var pendingTracks = [];

// limits & counters
var retryCount = 3;
var skipTrackLimit = 6;
var failedTrackCount = 0;
var failedTrackLimit = 4;

// timeout limits
var skipTrackTimeout = 3600000 // 1 hour
var activityTimeoutLimit = 28800000; // 8 hours

// timestamps
var lastActivityTimestamp = null;
var lastAutoCompleteRequest = null;

var waitVisible = false;
var lastTrackFailed = false;
var dontAddNextTrack = false;
var playPauseShouldHaveFocus = true;
