<template>
  <v-container>

      <h2>selected League:</h2>
        <div v-if="getSelectedLeague">
          <table class="tbl">
            <tr>
              <th class="pa-2 blue-grey lighten-3 text-left">Name:</th>
              <td class="pa-2 blue-grey darken-1 white--text text-left">{{ getSelectedLeague.n }}</td>
            </tr>
            <tr>
              <th class="pa-2 blue-grey lighten-3 text-left">created by:</th>
              <td class="pa-2 blue-grey darken-1 white--text text-left">{{ getSelectedLeague.creator }}</td>
            </tr>
            <tr>
              <th class="pa-2 blue-grey lighten-3 text-left">users:</th>
              <td class="pa-2 blue-grey darken-1 white--text text-left">{{ getSelectedLeague.au }}</td>
            </tr>
            <tr>
              <th class="pa-2 blue-grey lighten-3 text-left">max players per user team:</th>
              <td class="pa-2 blue-grey darken-1 white--text text-left">{{ getSelectedLeague.pl || "unlimited" }}</td>
            </tr>
            <tr>
              <th class="pa-2 blue-grey lighten-3 text-left">max players of a league team:</th>
              <td class="pa-2 blue-grey darken-1 white--text text-left">{{ getSelectedLeague.mpst || "unlimited" }}</td>
            </tr>
          </table>
        </div>
      <br>

      <v-divider></v-divider>

      <br>
      <h2>your Leagues:</h2>

      <v-list>
      <v-list-item-group v-model="activeLeague" color="primary">
        <v-list-item
          v-for="(item, i) in getLeagues"
          :key="i"
          @click="setLeague(item)"
        >
          <v-list-item-icon v-if="item.f" class="mr-5">
            <v-avatar>
              <img
                :src="item.f"
              >
            </v-avatar>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              <span v-text="item.n"></span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>

      <br>
      
      <v-divider></v-divider>

      <br>
        <v-textarea
          name="bearer"
          label="Bearer Token"
          :value="getToken"
          disabled
        ></v-textarea>

  </v-container>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex' 
import api from '../api/api'

export default {
  name: 'home-view',
  data: () => ({
  }),
  computed: {
    ...mapGetters([
      'getBearerToken',
      'getLeagues',
      'getLeague',
      'getSelectedLeague',
    ]),
    getToken() {
      return api.getToken()
    },
    activeLeague() {
      let league = null
      console.log("this.getLeagues", this.getLeagues , this.getLeagues.length , this.getLeague)
      if (this.getLeagues && this.getLeagues.length && this.getLeague) {
        this.getLeagues.forEach((element, i) => {
          if (element.id === this.getLeague) {
            league = i
          }
        });
      }
      return league
    }
  },
  methods: {
    ...mapMutations([
      'setLoading',
      'setLoadingMessages',
    ]),
    setLeague(league) {
      this.setLoadingMessages([])
      this.setLoading(true)
      localStorage.setItem('league', league.i)
      window.location.reload()
    }
  }
};
</script>
