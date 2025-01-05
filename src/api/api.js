import axios from 'axios'
import moment from 'moment'

import store from '../store/store'
import Constants from "../Constants";
import { sleep, smartPlayerStatsLoading } from "@/helper/helper";
// this holds the id, definition pairs for point events
// ideally you would call the api to get this but for now this will suffice
let pointEvents = {45: "Cross", 46: "Forward zone pass", 47: "Accurate Keeper-Sweeper (GK)", 48: "Accurate Throw (GK)", 49: "Accurate long Ball", 50: "Deadly Pass", 52: "Aerial lost", 79: "Aerial won", 80: "Rebound Assist", 81: "Rebound Assist", 82: "Own Goal forced", 83: "Deflected Assist", 84: "Woodwork Assist", 86: "Bonus: long range", 87: "Penalty scored", 88: "Penalty missed", 89: "Penalty missed", 90: "Penalty missed", 91: "Post", 92: "Left Post", 93: "Right Post", 94: "Back Pass Foul (GK)", 96: "Big Chance Created", 98: "Big Chance Created", 99: "Big Chance Created", 100: "Big Chance Created", 101: "Big Chance Created", 102: "Big Chance Created", 103: "Big Chance missed", 104: "Cross blocked", 106: "Challenge lost", 107: "Cleared on the Line", 108: "Cross not claimed (GK)", 109: "Dangerous play", 110: "Dive Catch (GK)", 111: "Dive Save (GK)", 112: "Cross blocked and Possession", 113: "Cleared", 114: "Mistake before Goal", 115: "Mistake before Shot", 116: "Incorrect Throw-In", 117: "Foul", 118: "Fouled last third", 120: "Intentional Assist", 121: "Cross Intercepted (GK)", 122: "One-on-One", 123: "Hand Ball", 124: "Interception", 125: "Ball intercepted", 126: "Interception in Box", 127: "Bonus: Last Man Tackle", 130: "Overrun", 131: "own goal", 132: "Penalty conceded", 133: "Penalty saved (GK)", 134: "Penalty won", 135: "Punched Ball (GK)", 136: "Red Card", 137: "Shot saved (GK)", 138: "Distance Shot saved (GK)", 139: "2nd Yellow", 141: "6 Sec violation (GK)", 142: "Standing saved (GK)", 143: "Pass final Third", 144: "Shot Assist", 147: "Offside", 148: "Offside", 149: "Shot on goal", 152: "Contest won", 153: "Corner won", 154: "Tackle won", 155: "Yellow Card", 156: "Starting 11", 157: "Possession lost", 159: "Team Goal", 160: "Goal conceded", 165: "Game Won", 166: "Game Lost", 167: "Played Minutes Bonus", 168: "Team Goal", 169: "Goal conceded", 170: "Team Goal", 171: "Goal conceded", 173: "Goal (GK)", 174: "Goal (Midfielder)", 175: "Goal (Defender)", 176: "Goal (Striker)", 177: "Assist (GK)", 178: "Assist (Defender)", 179: "Assist (Midfielder)", 180: "Assist (Striker)", 181: "Goal Set up (GK)", 182: "Goal Set up (Defender)", 183: "Goal Set up (Midfielder)", 184: "Goal Set up (Striker)", 185: "Goal (Substitute)", 186: "Assist (Substitute)", 187: "Goal Set up (Substitute)", 188: "Clean Sheet (GK)", 189: "Clean Sheet (Defender)", 190: "Clean Sheet (Midfielder)", 191: "Clean Sheet (Striker)", 194: "Big Chance saved (GK)", 195: "Ball covered unchallenged (GK)", 196: "Ball covered challenged (GK)", 197: "Shot on Target (narrow miss)", 199: "Shot on Goal (far away)", 200: "Shot on Target (blocked)", 203: "Penalty saved (penalty shoot-out)", 204: "Penalty missed (penalty shoot-out)", 205: "Penalty scored (penalty shoot-out)", 206: "Shot blocked", 207: "Shot blocked", 208: "Shot blocked", "-1": "Eingewechselt", "-2": "Ausgewechselt", "-8": "Von Anfang an gespielt", "-7": "Auf Bank", "-10": "Erste Halbzeit des Spiels beendet", "-17": "Zweite Halbzeit des Spiels beendet"};
let goalEventIds = [173, 174, 175, 176, 185]
let assistEventIds = [177, 178, 179, 180, 186]
let yellowCardEventId = 155
let secondYellowCardEventId = 139
let redCardEventId = 136
axios.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.response && error.response.status === 403) {
        localStorage.removeItem(Constants.LOCALSTORAGE.BEARER_TOKEN)
        localStorage.removeItem(Constants.LOCALSTORAGE.BEARER_TOKEN_EXPIRATION)
        window.location.reload()
    }
    return Promise.reject(error);
});

const api = {
    requestStack: {},
    getToken() {
        return 'Bearer ' + localStorage.getItem(Constants.LOCALSTORAGE.BEARER_TOKEN)
    },
    checkForCredentials() {
        if (localStorage.getItem('user') &&
            localStorage.getItem('password') &&
            localStorage.getItem('user') !== "" &&
            localStorage.getItem('password') !== ""
        ) {
            return true
        }
        return false
    },
    async loadMatchDay() {
        await axios({
            'url': 'https://api.kickbase.com/v4/competitions/1/matchdays',
            "method": 'GET',
            'data': {},
        }).then((gameMatchResponse) => {
            if (gameMatchResponse.data && gameMatchResponse.data.day) {
                store.commit('addMatchDay', {
                    day: gameMatchResponse.data.day,
                    data: gameMatchResponse.data
                })
            }
        })
    },
    async loadClubs() {
        //everything about this is broken
        await axios({
            'url': 'https://api.kickbase.com/v4/competitions/1/table',
            "method": 'GET',
            'data': {},
        })
            .then(async (response) => {
                if (response.status === 200) {
                    if (response.data && response.data.day) {
                        const nextGameDay = {
                            no: response.data.day,
                            ts: response.data.d,
                            nts: moment(response.data.d),
                            countdown: (response.data.m && response.data.m.ttm) ? response.data.m.ttm : null
                        }
                        let teams = [];

                        await axios({
                            'url': 'https://api.kickbase.com/v4/competitions/1/matchdays',
                            "method": 'GET',
                            'data': {},
                        }).then((nextGameMatchResponse) => {
                            if (nextGameMatchResponse.data && nextGameMatchResponse.data.day === nextGameDay.no) {
                                nextGameDay.matches = nextGameMatchResponse.data.e
                                store.commit('setNextMatchDay', nextGameDay)
                                if (nextGameMatchResponse.data.e && nextGameMatchResponse.data.e.length) {
                                    nextGameMatchResponse.data.e.forEach((match) => {
                                        if (match.t1) {
                                            teams.push(match.t1)
                                        }
                                        if (match.t2) {
                                            teams.push(match.t2)
                                        }
                                    })

                                    teams = teams.sort((a, b) => {
                                        if (a.n > b.n) {
                                            return 1;
                                        }
                                        if (a.n < b.n) {
                                            return -1;
                                        }
                                        return 0;
                                    })
                                    store.commit('setTeams', teams)
                                }
                            }

                        })
                    }
                }
            })
    },
    async checkBonusState() {
        store.commit('addLoadingMessage', 'checking daily bonus')
        await axios({
            'url': 'https://api.kickbase.com/v4/bonus/collect',
            "method": 'GET',
            'data': {},
        })
            .then((response) => {
                if (response.status === 200) {

                    if (response.data) {
                        if (response.data.amount !== 0) {
                            store.commit('setGiftLevel', response.data.level)
                            store.commit('setGiftBonus', response.data.amount)
                            localStorage.setItem(
                                Constants.LOCALSTORAGE.GIFT_DATA,
                                JSON.stringify(
                                    {
                                        level: response.data.level,
                                        amount: response.data.amount
                                    }
                                )
                            )
                        } else {
                            let lsGiftData = localStorage.getItem(Constants.LOCALSTORAGE.GIFT_DATA)
                            let hasGiftDetails = false
                            if (lsGiftData) {
                                lsGiftData = JSON.parse(lsGiftData)
                                if (lsGiftData && lsGiftData.level) {
                                    store.commit('setGiftLevel', lsGiftData.level)
                                    store.commit('setGiftBonus', lsGiftData.amount)
                                    hasGiftDetails = true
                                }
                            }
                            if (hasGiftDetails === false) {
                                store.commit('setGiftLevel', 'collected')

                            }
                        }
                        if (response.data.isAvailable) {
                            axios({
                                'url': 'https://api.kickbase.com/v4/bonus/collect',
                                "method": 'POST',
                                'data': {},
                            })
                                .then((response) => {
                                    if (response.status === 200) {
                                        if (response.data && response.data.err === 0) {
                                            store.commit('setFetchedGift', true)
                                        } else {
                                            store.commit('setFetchedGift', false)
                                        }
                                    } else {
                                        store.commit('setErrorMessage', 'could not find token data')
                                    }
                                })
                        } else {
                            store.commit('setFetchedGift', true)
                        }
                    } else {
                        store.commit('setErrorMessage', 'could not find token data')
                    }
                }
            })
            .catch(function () {
                // TODO: IMPROVE
                let lsGiftData = localStorage.getItem(Constants.LOCALSTORAGE.GIFT_DATA)
                let hasGiftDetails = false
                if (lsGiftData) {
                    lsGiftData = JSON.parse(lsGiftData)
                    if (lsGiftData && lsGiftData.level) {
                        store.commit('setGiftLevel', lsGiftData.level)
                        store.commit('setGiftBonus', lsGiftData.amount)
                        hasGiftDetails = true
                    }
                }
                if (hasGiftDetails === false) {
                    store.commit('setGiftLevel', 'collected')
                }
                // store.commit('setErrorMessage', 'could not fetch gift/bonus status')
            })
    },
    login() {
        axios({
            'url': 'https://api.kickbase.com/v4/user/login',
            "method": 'POST',
            'data': {
                'em': localStorage.getItem('user'),
                'loy': false,
                'pass': localStorage.getItem('password'),
                'rep': {},
            }
        })
            .then((response) => {
                console.log('Full Login Response:', response); // Inspect the full response
                console.log('Response Data:', response.data); // Inspect the data object
                if (response.status === 200) {

                    if (response.data.tkn && response.data.tknex) {
                        localStorage.setItem(Constants.LOCALSTORAGE.BEARER_TOKEN, response.data.tkn)
                        localStorage.setItem(Constants.LOCALSTORAGE.BEARER_TOKEN_EXPIRATION, response.data.tknex)
                        store.commit('setLoading', true)

                        window.location.reload()
                    } else {
                        store.commit('setErrorMessage', 'could not find token data')
                    }
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'login issues')
            })
    },
    async loadRanking(cb) {
        axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/ranking',
            "method": "GET",
        })
            .then((response) => {
                if (response.status === 200) {
                    if (response.data && response.data.us && response.data.day) { //where the fuck is "matchdays" in the new json? "day"? -CP
                        store.commit('setRanking', response.data)
                        if (typeof cb === 'function') {
                            cb()
                        }
                    }
                }
            }).catch(function () {
                store.commit('addErrorLoadingMessage', 'could not fetch ranking')
                store.commit('setErrorMessage', 'could not fetch ranking')
            })
    },
    async loadPersonalData(cb, showLoading = true) {
        if (showLoading) {
            store.commit('setLoading', true)
            store.commit('addLoadingMessage', 'loading personal data. please wait')
        }
        await axios({
            'url': 'https://api.kickbase.com/v4/user/settings',
            "method": "GET",
        })
            .then((response) => {
                console.log("userdata", response)
                if (response.status === 200) {
                    if (response.data && response.data.u && response.data.u.i) {
                        store.commit('setSelfData', response.data.u)
                        store.commit('setSelf', response.data.u.i * 1)
                        if (typeof cb === 'function') {
                            cb()
                        }
                    }
                }
            }).catch(function () {
                if (showLoading) {
                    store.commit('addErrorLoadingMessage', 'could not fetch user data')
                    store.commit('setErrorMessage', 'could not fetch user data')
                }
            })
    },
    async loadLeagues() {
        store.commit('setLoading', true);
        store.commit('addLoadingMessage', 'Loading leagues. Please wait...');
        await axios({
            url: 'https://api.kickbase.com/v4/leagues/selection',
            method: 'GET',
        })
            .then((response) => {
                if (response.status === 200) {
                    store.commit('addLoadingMessage', 'Player\'s league successfully fetched');
                    console.log('Leagues', response.data);
                    if (response.data && response.data.it && response.data.it.length) {
                        // Update leagues in the store
                        store.commit('setLeagues', response.data.it);

                        let setLeague = null;

                        // Check for a previously selected league in localStorage
                        if (localStorage.getItem('league')) {
                            response.data.it.forEach((league) => {
                                if (league.i === localStorage.getItem('league')) {
                                    store.commit('setLeague', league.i);
                                    setLeague = league;
                                }
                            });
                        }

                        // If no league is set, default to the first league
                        if (setLeague === null) {
                            setLeague = response.data.it[0];
                            localStorage.setItem('league', setLeague.i);
                            store.commit('setLeague', setLeague.i);
                        }

                        store.commit('addLoadingMessage', 'Set league: ' + setLeague.n);
                    }
                }
            })
            .catch(() => {
                store.commit('addErrorLoadingMessage', 'Could not fetch player\'s leagues');
                store.commit('setErrorMessage', 'Could not fetch player\'s leagues');
            });
    },
    async loadUsersPlayerOffers() {
        store.commit('addLoadingMessage', 'loading market offers')
        return await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market',
            "method": "GET",
        })
            .then(async (response) => {
                if (response.status === 200) {
                    store.commit('addLoadingMessage', 'offers successfully fetched ... please wait')
                    return response.data
                }
            }).catch(function () {
                store.commit('addErrorLoadingMessage', 'could not fetch player\'s offers')
                store.commit('setErrorMessage', 'could not fetch player\'s offers')
            })

    },
    async loadBids(fetchStats, cb) {
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market',
            "method": "GET",
        })
            .then(async (response) => {
                if (response.status === 200) {
                    const players = response.data.players

                    players.sort((a, b) => (a.expiry > b.expiry) ? 1 : -1)

                    const cleanedPlayers = []
                    players.forEach((player) => {
                        let shouldAdd = true

                        if (player.userId * 1 === store.getters.getSelf) {
                            shouldAdd = false
                        }
                        if (shouldAdd) {
                            cleanedPlayers.push(player)
                        }
                    })

                    if (fetchStats) {
                        const playerIds = []
                        for (const player of cleanedPlayers) {
                            if (!player.userId) {
                                playerIds.push(player.id)
                            }
                        }
                        await smartPlayerStatsLoading(playerIds)
                    }
                    store.commit('setBids', cleanedPlayers)
                    if (typeof cb === 'function') {
                        cb()
                    }
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch transfer market')
            })
            .finally(function () {
            })
    },
    async loadPlayersPoints(playerId) {
        console.log("playerids", playerId)
        const rId = 'p' + playerId
        const controller = new AbortController();

        if (this.requestStack[rId]) {
            this.requestStack[rId].abort()
        }

        this.requestStack[rId] = controller

        return await axios({
            signal: controller.signal,
            //'url': 'https://api.kickbase.com/v2/players/' + playerId + '/points',
            // /points is gone gg
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/players' + playerId + '/performance',
            "method": "GET",
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.data
                }
            })
            .catch(function () {
                // store.commit('setErrorMessage', 'could not fetch details of player with id: ' + playerId)
            })
            .finally(() => {
                if (this.requestStack[rId]) {
                    delete this.requestStack[rId]
                }
            })
    },
    async loadPlayersStats(playerId, justReturnAsPromise = false) {
        const controller = new AbortController();

        if (this.requestStack[playerId]) {
            this.requestStack[playerId].abort()
        }

        this.requestStack[playerId] = controller
        return await axios({
            signal: controller.signal,
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/players/' + playerId + '/performance',
            "method": "GET",
        })
            .then((response) => {
                if (response.status === 200) {
                    if (justReturnAsPromise === true) {
                        return response.data
                    } else {
                        store.commit('addPlayer', response.data)
                    }
                }
            })
            .catch(function () {
                // store.commit('setErrorMessage', 'could not fetch details of player with id: ' + playerId)
            })
            .finally(() => {
                if (this.requestStack[playerId]) {
                    delete this.requestStack[playerId]
                }
            })
    },
    async loadUsersStats(includeUsersToUpdateBudget = false) {
        store.commit('addLoadingMessage', 'loading details of user')
        await axios({
            //'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/managers/' + store.getters.getSelf + '/dashboard',
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/managers/' + store.getters.getSelf + '/performance',
            "method": "GET",
        }).then(async (profile) => {
            console.log("Profile", profile)
            if (profile.data) {
                if (includeUsersToUpdateBudget === true) {
                    console.log("loadUsers")
                    await api.loadUsers(includeUsersToUpdateBudget)
                }
                const userX = Object.assign(store.getters.getUsersDetails, profile.data)
                console.log("userX", userX)
                store.commit('addUser', userX)
                await api.loadUsersPlayers(userX.u, true)
            }
        })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch own profile')
            });
    },
    async loadUsers(justToUpdateBudget = false) {
        store.commit('addLoadingMessage', 'getting league\'s stats')
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/ranking',
            "method": "GET",
        })
            .then(async (response) => {
                console.log('Users', response)
                if (response.status === 200) {

                    if (response.data && response.data.us && response.data.us.length) {
                        for (let i = 0; i < response.data.us.length; i++) {
                            const player = response.data.us[i]
                            console.log("Test ", player)
                            store.commit('addUser', player)
                            if (justToUpdateBudget === false) {
                                await api.loadUsersPlayers(player.i, false)
                            }
                        }
                    }

                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch league stats')
            })
    },
    saveLineup(data, cb, errorCb) {
        axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/lineup',
            "method": "POST",
            data
        })
            .then((response) => {
                if (response.status === 200 && response.data.err === 0) {
                    cb(response.data)
                } else {
                    store.commit('setErrorMessage', 'could not save lineup')
                }
            })
            .catch(function () {
                errorCb()
                store.commit('setErrorMessage', 'could not save lineup')
            })
    },
    loadLineup(cb) {
        axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/lineup',
            "method": "GET",
        })
            .then((response) => {
                if (response.status === 200) {
                    cb(response.data)
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch lineup')
            })
    },
    async loadNextTwoMatchDays() {
        const currentMatchDay = store.getters.getNextMatchDay;
        const fetchedGameDays = [];

        // Validate currentMatchDay
        if (!currentMatchDay || !currentMatchDay.no) {
            console.error('currentMatchDay is null or missing "no" property:', currentMatchDay);
            return; // Exit the function if currentMatchDay is invalid
        }

        fetchedGameDays.push({ m: currentMatchDay.matches, md: currentMatchDay.no, d: currentMatchDay.no });
        store.commit('addLoadingMessage', 'loading next matchdays for stats');
        const gameDays = [currentMatchDay.no + 1, currentMatchDay.no + 2];

        for (let i = 0; i < gameDays.length; i++) {
            if (gameDays[i] <= 34) {
                const matchDay = await axios({
                    url: `https://api.kickbase.com/v4/competitions/1/matchdays/`,
                    method: "GET",
                })
                    .then((response) => {
                        if (response.data && response.data.it && response.data.it.length == 34) {
                            return response.data;
                        }
                    })
                    .catch((error) => {
                        console.error('Error fetching matchday data:', error);
                        return null; // Handle errors gracefully
                    });
                if (matchDay) {
                    fetchedGameDays.push({
                        d: gameDays[i],
                        m: matchDay.it[gameDays[i]].it,
                        md: gameDays[i],
                    });
                }
            }
        }

        if (fetchedGameDays.length) {
            store.commit('setNextThreeMatchDays', fetchedGameDays);
        }
    },
    async loadMatches(matchDay) {
        // This is some of the most atrocious code I have ever seen
        store.commit('addLoadingMessage', 'loading next matchday')
        await axios({
            'url': 'https://api.kickbase.com/v4/competitions/1/matchdays',
            "method": "GET",
        })
            // This will give you the current matchday (response.data.day), as well as an array containing all matchdays with all matches (response.data.it)
            .then(async (response) => {
                console.log('Matches', response)
                // no idea why this works
                if (response.data && response.data.it && response.data.it.length == 34) {
                    matchDay = response.data.day // the current match day
                    const lastMatch = response.data.it[matchDay - 1].it[response.data.it[matchDay - 1].it.length - 1] // the last match of the current matchday
                    // to be honest, I dont understand whats happening here but it works somehow
                    if (moment(lastMatch.dt).isSameOrAfter(new Date(), 'day') === true) {
                        const lNextDay = store.getters.getNextMatchDay
                        const nextGameDay = {
                            ...lNextDay,
                            no: response.data.day,
                            ts: response.data.it[matchDay - 1].day,
                            nts: moment(response.data.it[matchDay - 1].day),
                            matches: response.data.it[matchDay - 1].it

                        };
                        const matches = response.data.it[matchDay - 1].it.map((match) => {
                            match.md = response.data.day
                            return match
                        })
                        store.commit('setMatches', matches)
                        store.commit('setNextMatchDay', nextGameDay)
                    } else {
                        const nextMatchday = response.data.day + 1
                        if (nextMatchday <= 34) {
                            await api.loadMatches(nextMatchday)
                        }
                    }
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch matchday')
            })
    },
    async loadFeed(cb) {
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/activitiesfeed',
            "method": "GET",
            'params': {
                start: 0,
                filter: '3,5,13,15,16,17'
            }
        })
            .then(async (response) => {
                if (response.status === 200) {
                    await cb(response.data)
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not fetch feed')
            })
            .finally(function () {
            });
    },

    async loadUsersLineup(userId) {
        const user = userId
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/users/' + user + '/teamcenter',
            "method": "GET",
        }).then(async (response) => {
            console.log('Lineup', response)
            if (response.status === 200) {
                store.commit('addUsersLineup', {
                    user,
                    data: response.data.lp
                })
            }
        })
    },
    async loadUsersPlayers(userId, loadPlayerStates = true) {
        const user = userId
        store.commit('addLoadingMessage', 'loading players and lineup of user #' + user)
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/managers/' + user + '/squad',
            "method": "GET",
        }).then(async (response) => {
            console.log('Players', response)
            if (response.status === 200) {
                store.commit('addUsersPlayer', {
                    user,
                    players: response.data.it
                })
                console.log('Players', loadPlayerStates)
                if (loadPlayerStates === true) {
                    const playerIds = []
                    for (let i = 0; i < response.data.it.length; i++) {
                        playerIds.push(response.data.it[i].pi)
                    }
                    console.log('PlayerIds', playerIds)
                    await api.loadUsersLineup(user)
                    await smartPlayerStatsLoading(playerIds)
                }
            }
        })
    },
    // because the old live api endpoint is gone, we need to do crazy shit
    // load all users and their players, then load the point data for all players
    loadGlobalLiveData() {
        return new Promise((resolve, reject) => {
            let uspl = {} // this is a key-value store with the key being the userid and the values being the lineup
            let returnData = {} // this will hold the return data
            let nameId = {} // this is a key-value store for user-id and user-name
            let totalpl = {} // this will hold the current place of the user
            // expected return json: 
            // {data:
            //      {us:
            //          {0:
            //              {i: "User ID",
            //               n: "User Name",
            //               lp: "Users Lineup WARNING!! If the game day has not started this will be empty. "
            //              }
            //           }
            //       }
            // }
            axios({
                'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/ranking',
                "method": "GET",
            }).then(async (response) => {
                if (response.status === 200) {
                    if (response.data && response.data.us && response.data.us.length) { // loop through all users
                        for (let i = 0; i < response.data.us.length; i++) {
                            const user = response.data.us[i]
                            uspl[user.i] = user.lp // users lineup
                            nameId[user.i] = user.n // this matches the user-id to the user name
                            totalpl[user.i] = user.spl // this is the current place of the user
                        }
                    }
                }
                for (var key in uspl) { // loop through all users
                    let lineup = uspl[key]
                    returnData[key] = { t: 0, pl: [], st: totalpl[key], n: nameId[key] }
                    let sum = 0
                    let promises = lineup.map(player => {
                        // expected return json: 
                        // {data:
                        //      {p: "Points",
                        //       n: "Player Name",
                        //       events: [ei: "Event ID", eti: "Event Type ID", p: "Current points", mt: "Minute"]
                        //      }
                        // }
                        return axios({
                            url: `https://api.kickbase.com/v4/competitions/1/playercenter/${player}`,
                            method: "GET",
                        }).then(response => {
                            if (response.status === 200) {
                                if (!response.data.p) {
                                    response.data.p = 0;
                                }
                                // go through the list of events and filter for goals, assists etc.
                                const goalEvents = response.data.events.filter(event => goalEventIds.includes(event.eti));
                                const assistEvents = response.data.events.filter(event => assistEventIds.includes(event.eti));
                                const yellowCardEvents = response.data.events.filter(event => event.eti === yellowCardEventId);
                                const redCardEvents = response.data.events.filter(event => event.eti === redCardEventId);
                                const secondYellowCardEvents = response.data.events.filter(event => event.eti === secondYellowCardEventId);
                                
                                let playerEvents = response.data.events.map(event => {
                                    const eventMinute = event.mt;
                                    const eventTypeId = event.eti;
                                    const eventPoints = event.p;
                                    const eventDesc = pointEvents[eventTypeId] || 'Unknown';
                                    return { mt: eventMinute, p: eventPoints, eti: eventDesc };
                                }).sort((a, b) => b.mt - a.mt); // This generates a sorted list of events with the current points, the event and the minute

                                sum += response.data.p; // Update the total sum
                                let playerName = response.data.n; // Player name
                                let playerPoints = response.data.p; // Player points
                                
                                returnData[key].pl.push({ n: playerName, p: playerPoints, g: goalEvents.length, 
                                    a: assistEvents.length, y: yellowCardEvents.length + secondYellowCardEvents.length, 
                                    r: redCardEvents.length, yr: secondYellowCardEvents.length, events: playerEvents });
                            }
                        })
                            .catch(error => {
                                console.error(`Error fetching data for player ${player}:`, error);
                            });
                    });
                    // Wait for all promises to resolve before setting returndata[key].t
                    await Promise.all(promises);
                    returnData[key].t = sum;
                }
                store.commit('setLiveData', returnData);
                resolve(returnData);
            })
                .catch(function (error) {
                    store.commit('setErrorMessage', 'could not fetch league stats')
                    reject(error);
                });
        });
    },
    sendBid(playerId, price, callback, multi, errorCb) {
        const cb = callback
        const getBidReq = () => {
            return axios.post(
                'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market/' + playerId + '/offers',
                {
                    price
                }
            )
        }

        const reqs = [
            getBidReq()
        ]
        if (multi === true) {
            reqs.push(getBidReq())
            reqs.push(getBidReq())
        }

        axios.all(reqs).then(axios.spread((...responses) => {
            const responseOne = responses[0]
            if (responseOne.status === 200) {
                if (typeof cb === 'function') {
                    cb(responseOne.data)
                }
            }
        })).catch(errors => {
            console.warn(errors)
            if (errors.response && errors.response.data) {
                if (errors.response.data.err === 5060) {
                    // store.commit('setErrorMessage', errors.response.data.errMsg)
                    store.commit('setErrorMessage', 'offer too low')
                }
                if (errors.response.data.err === 5050) {
                    // ThirtyThreePercentRuleExceeded
                    store.commit('setErrorMessage', 'you reached your financial limit (max. 33% debt of your team\'s market value)')
                }
                if (errors.response.data.err === 5030) {
                    // ThirtyThreePercentRuleExceeded
                    store.commit('setErrorMessage', 'You have reached the limit for players per team (max. ' + store.getters.getSelectedLeague.pl + ' players)')
                }
                if (errors.response.data.err === 5070) {
                    // ThirtyThreePercentRuleExceeded
                    store.commit('setErrorMessage', 'You have reached the limit for players of this Bundesliga team (max. ' + store.getters.getSelectedLeague.mpst + ' players)')
                }
            }
            if (typeof errorCb === 'function') {
                errorCb()
            }
        })

    },
    async revokeBid(playerId, offerId, callback) {
        const cb = callback
        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market/' + playerId + '/offers/' + offerId,
            "method": "DELETE"
        }).then(async (response) => {
            if (response.status === 200) {
                if (typeof cb === 'function') {
                    await cb(response.data)
                }
            }
        })
    },
    async putOnMarket(player, callback) {
        store.commit('addLoadingMessage', 'trying to put player "' + player.lastName + '" on market')

        const cb = callback
        let price = player.marketValue + ""

        await axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market',
            "method": "POST",
            'data': {
                playerId: player.id,
                price
            },
        }).then(async (response) => {
            if (response.status === 200) {
                store.commit('addLoadingMessage', 'player successfully put on market')
                if (typeof cb === 'function') {
                    await cb(response)
                }
            }
        }).catch(errors => {
            console.warn(errors)
            store.commit('addErrorLoadingMessage', 'error occured during putting player on market. lets try it again')
            api.putOnMarket(player, cb)
        })
    },
    async removePlayerFromMarket(player, callback) {
        store.commit('addLoadingMessage', 'removing player "' + player.lastName + '" from market')
        const cb = callback
        axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market/' + player.id,
            "method": 'DELETE',
        })
            .then((response) => {
                if (response.status === 200) {
                    if (typeof cb === 'function') {
                        store.commit('addLoadingMessage', 'removed player "' + player.lastName + '" from market')
                        cb(response.data)
                    }
                }
            })
            .catch(function () {
                store.commit('setErrorMessage', 'could not remove player from market')
            })
    },
    async setPlayerOnMarketAgain(player) {
        store.commit('setLoading', true)
        await api.removePlayerFromMarket(player)
        await sleep(500)
        await api.putOnMarket(player)
    },
    acceptBids(offer, callback) {
        axios({
            'url': 'https://api.kickbase.com/v4/leagues/' + store.getters.getLeague + '/market/' + offer.playerId + '/offers/' + offer.offerId + '/accept',
            "method": "POST",
        }).then((first) => {
            if (first.status === 200) {
                if (typeof callback === 'function') {
                    callback()
                }
            }
        })

    }
}
axios.defaults.headers.common['Authorization'] = api.getToken();

export default api
