<template>
  <div class="full-width-container">
    <div class="d-flex flex-wrap flex-sm-nowrap justify-space-between align-center">
      <h2 class="text-h4 text-sm-h3 mb-5">Live Scores</h2>
      <reload-button :loading="loading" v-on:click.native="reload"></reload-button>
    </div>

    <v-expansion-panels multiple accordion class="elevation-1 player-card-accordion" v-if="getUsers && getUsers.length">
      <v-expansion-panel v-for="(user, idx) in getUsers" :key="user.id">
        <v-expansion-panel-header class="elevation-0">
          <template v-slot:default>
            <v-row no-gutters>
              <v-col cols="12" md="3">
                {{ (idx + 1) }}. <strong>{{ user.n }}</strong>:
              </v-col>
              <v-col md="9" cols="12" class="text--secondary">
                {{ user.t }} / {{ user.st }} (with <strong>{{ numberOfPlayersWhoScored(user.pl) }}</strong> players, who have scored)
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>

        <v-expansion-panel-content>
          <v-expansion-panels multiple accordion>
            <v-expansion-panel v-for="player in user.pl" :key="player.id">
              <v-expansion-panel-header>
                <v-row no-gutters>
                  <v-col cols="12" md="6">
                    <strong>{{ player.n }}</strong>
                  </v-col>
                  <v-col cols="12" md="6" class="text--secondary">
                    Points: {{ player.p }} | Goals: {{ player.g || 0 }} | Assists: {{ player.a || 0 }} 
                    | Yellow Cards: {{ player.y || 0 }} | Red Cards: {{ player.r || 0 }}
                  </v-col>
                </v-row>
              </v-expansion-panel-header>

              <v-expansion-panel-content>
                <div v-if="player.events && player.events.length">
                  <h4 class="text-h6 mb-3">Events</h4>
                  <v-data-table
                    :headers="eventHeaders"
                    :items="player.events"
                    :items-per-page="-1"
                    class="elevation-1"
                    hide-default-footer
                  ></v-data-table>
                </div>
                <div v-else>
                  No events available for this player.
                </div>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <spinner v-else></spinner>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import api from '../api/api';
import numeral from 'numeral';

numeral.locale('deff');

import Spinner from './Spinner';
import ReloadButton from "./Generic/ReloadButton";

export default {
  name: 'live-view',
  components: {
    ReloadButton,
    Spinner,
  },
  data: () => ({
    loading: false,
    headers: [
      { text: 'Name', align: 'start', value: 'n' },
      { text: 'Points', value: 'p' },
      { text: 'Goals', value: 'g', align: ' d-none d-md-table-cell' },
      { text: 'Assists', value: 'a', align: ' d-none d-md-table-cell' },
      { text: 'Yellow-Card', value: 'y', mobile: false, align: ' d-none d-md-table-cell' },
      { text: 'Yellow/Red-Card', value: 'yr', align: ' d-none d-md-table-cell' },
      { text: 'Red-Card', value: 'r', align: ' d-none d-md-table-cell' },
      { text: 'position', value: 'p', align: ' d-none' },
      { text: 's', value: 's', align: ' d-none' },
      { text: 'tid', value: 'tid', align: ' d-none ' },
    ],
    eventHeaders: [
      { text: 'Event Type', value: 'eti' },
      { text: 'Points', value: 'p' },
      { text: 'Minute', value: 'mt' },
    ],
    options: {
      itemsPerPage: -1,
      body: {
        isMobile: false,
      }
    }
  }),
  computed: {
    ...mapGetters(['getLiveData']),
    getUsers() {
      const liveData = this.getLiveData;
      if (liveData && Object.keys(liveData).length) {
        const users = Object.entries(liveData).map(([id, userData]) => ({
          id,
          n: userData.n || 'Unknown',
          t: userData.t,
          st: userData.st,
          pl: userData.pl.sort((a, b) => b.p - a.p)
        }));

        return users.sort((a, b) => {
          if (a.t !== b.t) return b.t - a.t;
          return a.st - b.st;
        });
      }
      return [];
    }
  },
  mounted() {
    this.loading = true;
    window.setTimeout(() => {
      this.reload();
    }, 2000);
  },
  methods: {
    async reload() {
      this.loading = true;
      await api.loadGlobalLiveData().then(() => {
        window.setTimeout(() => { this.loading = false }, 200);
      }).catch(error => {
        console.error('Error loading live data:', error);
        this.loading = false;
      });
    },
    numberOfPlayersWhoScored(players) {
      return players.filter(p => p.p !== 0).length;
    }
  }
};
</script>
