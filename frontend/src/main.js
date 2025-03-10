import Vue from 'vue';
import axios from 'axios';
import VueCookies from 'vue-cookies'
import BootstrapVue from 'bootstrap-vue'
import VueClipboard from 'vue-clipboard2'
import Notifications from 'vue-notification'
import VueGoodTablePlugin from 'vue-good-table'

Vue.use(VueCookies)
Vue.use(VueClipboard)
Vue.use(BootstrapVue)
Vue.use(Notifications)
Vue.use(VueGoodTablePlugin)

var axios_cfg = function(url, data='', type='form') {
  if (data == '') {
    return {
      method: 'get',
      url: url
    };
  } else if (type == 'form') {
    return {
      method: 'post',
      url: url,
      data: data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };
  } else if (type == 'file') {
    return {
      method: 'post',
      url: url,
      data: data,
      headers: { 'Content-Type': 'multipart/form-data' }
    };
   } else if (type == 'json') {
    return {
      method: 'post',
      url: url,
      data: data,
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

new Vue({
  el: '#app',
  data: {
    columns: [
      {
        label: 'Name',
        field: 'Identity',
        // filterable: true,
      },
      {
        label: 'Account Status',
        field: 'AccountStatus',
        filterable: true,
      },
      {
        label: 'Connection Server',
        field: 'ConnectionServer',
        filterable: true,
      },
      {
        label: 'Expiration Date',
        field: 'ExpirationDate',
        type: 'date',
        dateInputFormat: 'yyyy-MM-dd HH:mm:ss',
        dateOutputFormat: 'yyyy-MM-dd HH:mm:ss',
        formatFn: function (value) {
          return value != "" ? value : ""
        }
      },
      {
        label: 'Revocation Date',
        field: 'RevocationDate',
        type: 'date',
        dateInputFormat: 'yyyy-MM-dd HH:mm:ss',
        dateOutputFormat: 'yyyy-MM-dd HH:mm:ss',
        formatFn: function (value) {
          return value != "" ? value : ""
        }
      },
      {
        label: 'Actions',
        field: 'actions',
        sortable: false,
        tdClass: 'text-right',
        globalSearchDisabled: true,
      },
    ],
    rows: [],
    actions: [
      {
        name: 'u-change-password',
        label: 'Change password',
        class: 'btn-warning',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ['passwdAuth'],
      },
      {
        name: 'u-revoke',
        label: 'Revoke',
        class: 'btn-warning',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      {
        name: 'u-unrevoke',
        label: 'Unrevoke',
        class: 'btn-primary',
        showWhenStatus: 'Revoked',
        showForServerRole: ['master'],
        showForModule: ["core"],
      },
      // {
      //   name: 'u-show-config',
      //   label: 'Show config',
      //   class: 'btn-primary',
      //   showWhenStatus: 'Active',
      //   showForServerRole: ['master', 'slave'],
      //   showForModule: ["core"],
      // },
      {
        name: 'u-download-config',
        label: 'Download config',
        class: 'btn-info',
        showWhenStatus: 'Active',
        showForServerRole: ['master', 'slave'],
        showForModule: ["core"],
      },
      {
        name: 'u-edit-ccd',
        label: 'Edit routes',
        class: 'btn-primary',
        showWhenStatus: 'Active',
        showForServerRole: ['master'],
        showForModule: ["ccd"],
      },
      {
        name: 'u-edit-ccd',
        label: 'Show routes',
        class: 'btn-primary',
        showWhenStatus: 'Active',
        showForServerRole: ['slave'],
        showForModule: ["ccd"],
      }
    ],
    filters: {
      hideRevoked: true,
    },
    serverRole: "master",
    lastSync: "unknown",
    modulesEnabled: [],
    u: {
      newUserName: '',
      newUserPassword: '',
      newUserCreateError: '',
      newPassword: '',
      passwordChangeStatus: '',
      passwordChangeMessage: '',
      modalNewUserVisible: false,
      modalShowConfigVisible: false,
      modalShowCcdVisible: false,
      modalChangePasswordVisible: false,
      openvpnConfig: '',
      ccd: {
        Name: '',
        ClientAddress: '',
        CustomRoutes: []
      },
      newRoute: {},
      ccdApplyStatus: "",
      ccdApplyStatusMessage: "",
    }
  },
  watch: {
  },
  mounted: function () {
    this.getUserData();
    this.getServerSetting();
    this.filters.hideRevoked = this.$cookies.isKey('hideRevoked') ? (this.$cookies.get('hideRevoked') == "true") : false
  },
  created() {
    var _this = this;

    _this.$root.$on('u-revoke', function (msg) {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/revoke', data, 'form'))
      .then(function(response) {
        _this.getUserData();
        _this.$notify({title: 'User ' + _this.username + ' revoked!', type: 'warn'})
      });
    })
    _this.$root.$on('u-unrevoke', function () {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/unrevoke', data, 'form'))
      .then(function(response) {
        _this.getUserData();
        _this.$notify({title: 'User ' + _this.username + ' unrevoked!', type: 'success'})
      });
    })
    _this.$root.$on('u-show-config', function () {
      _this.u.modalShowConfigVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/config/show', data, 'form'))
      .then(function(response) {
        _this.u.openvpnConfig = response.data;
      });
    })
    _this.$root.$on('u-download-config', function () {
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/config/show', data, 'form'))
      .then(function(response) {
        const blob = new Blob([response.data], { type: 'text/plain' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = _this.username + ".ovpn"
        link.click()
        URL.revokeObjectURL(link.href)
      }).catch(console.error);
    })
    _this.$root.$on('u-edit-ccd', function () {
      _this.u.modalShowCcdVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/ccd', data, 'form'))
      .then(function(response) {
        _this.u.ccd = response.data;
      });
    })
    _this.$root.$on('u-disconnect-user', function () {
      _this.u.modalShowCcdVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
      axios.request(axios_cfg('api/user/disconnect', data, 'form'))
      .then(function(response) {
        console.log(response.data);
      });
    })
    _this.$root.$on('u-change-password', function () {
      _this.u.modalChangePasswordVisible = true;
      var data = new URLSearchParams();
      data.append('username', _this.username);
    })
  },
  computed: {
    customAddressDisabled: function () {
      return this.serverRole == "master" ? this.u.ccd.ClientAddress == "dynamic" : true
    },
    ccdApplyStatusCssClass: function () {
        return this.u.ccdApplyStatus == 200 ? "alert-success" : "alert-danger"
    },
    passwordChangeStatusCssClass: function () {
      return this.u.passwordChangeStatus == 200 ? "alert-success" : "alert-danger"
    },
    modalNewUserDisplay: function () {
      return this.u.modalNewUserVisible ? {display: 'flex'} : {}
    },
    modalShowConfigDisplay: function () {
      return this.u.modalShowConfigVisible ? {display: 'flex'} : {}
    },
    modalShowCcdDisplay: function () {
      return this.u.modalShowCcdVisible ? {display: 'flex'} : {}
    },
    modalChangePasswordDisplay: function () {
      return this.u.modalChangePasswordVisible ? {display: 'flex'} : {}
    },
    revokeFilterText: function() {
      return this.filters.hideRevoked ? "Show revoked" : "Hide revoked"
    },
    filteredRows: function() {
      if (this.filters.hideRevoked) {
        return this.rows.filter(function(account) {
          return account.AccountStatus == "Active"
        });
      } else {
        return this.rows
      }
    }

  },
  methods: {
    rowStyleClassFn: function(row) {
      return row.ConnectionStatus == 'Connected' ? 'connected-user' : ''
    },
    rowActionFn: function(e) {
      this.username = e.target.dataset.username;
      this.$root.$emit(e.target.dataset.name);
    },
    getUserData: function() {
      var _this = this;
      axios.request(axios_cfg('api/users/list'))
        .then(function(response) {
          _this.rows = Array.isArray(response.data) ? response.data : [];
        });
    },

    staticAddrCheckboxOnChange: function() {
      var staticAddrInput = document.getElementById('static-address');
      var staticAddrEnable = document.getElementById('enable-static');

      staticAddrInput.disabled = !staticAddrEnable.checked;
      staticAddrInput.value == "dynamic" ? staticAddrInput.value = "" : staticAddrInput.value = "dynamic";
    },

    getServerSetting: function() {
      var _this = this;
      axios.request(axios_cfg('api/server/settings'))
      .then(function(response) {
        _this.serverRole = response.data.serverRole;
        _this.modulesEnabled = response.data.modules;

        if (_this.serverRole == "slave") {
          axios.request(axios_cfg('api/sync/last/successful'))
          .then(function(response) {
            _this.lastSync =  response.data;
          });
        }
      });
    },

    createUser: function() {
      var _this = this;

      _this.u.newUserCreateError = "";

      var data = new URLSearchParams();
      data.append('username', _this.u.newUserName);
      data.append('password', _this.u.newUserPassword);

      axios.request(axios_cfg('api/user/create', data, 'form'))
      .then(function(response) {
        _this.u.modalNewUserVisible = false;
        _this.u.newUserName = '';
        _this.u.newUserPassword = '';
        _this.getUserData();
        _this.$notify({title: 'New user ' + _this.username + ' created', type: 'success'})
      })
      .catch(function(error) {
        _this.u.newUserCreateError = error.response.data;
        _this.$notify({title: 'New user ' + _this.username + ' creation failed.', type: 'error'})

      });
    },

    ccdApply: function() {
      var _this = this;

      _this.u.ccdApplyStatus = "";
      _this.u.ccdApplyStatusMessage = "";

      axios.request(axios_cfg('api/user/ccd/apply', JSON.stringify(_this.u.ccd), 'json'))
      .then(function(response) {
        _this.u.ccdApplyStatus = 200;
        _this.u.ccdApplyStatusMessage = response.data;
        _this.$notify({title: 'Ccd for user ' + _this.username + ' applied', type: 'success'})
      })
      .catch(function(error) {
        _this.u.ccdApplyStatus = error.response.status;
        _this.u.ccdApplyStatusMessage = error.response.data;
        _this.$notify({title: 'Ccd for user ' + _this.username + ' apply failed ', type: 'error'})
      });
    },

    changeUserPassword: function(user) {
      var _this = this;

      _this.u.passwordChangeMessage = "";

      var data = new URLSearchParams();
      data.append('username', user);
      data.append('password', _this.u.newPassword);

      axios.request(axios_cfg('api/user/change-password', data, 'form'))
        .then(function(response) {
          _this.u.passwordChangeStatus = 200;
          _this.u.newPassword = '';
          _this.getUserData();
          _this.u.modalChangePasswordVisible = false;
          _this.$notify({title: 'Password for user ' + _this.username + ' changed!', type: 'success'})
        })
        .catch(function(error) {
          _this.u.passwordChangeStatus = error.response.status;
          _this.u.passwordChangeMessage = error.response.data.message;
          _this.$notify({title: 'Changing password for user ' + _this.username + ' failed!', type: 'error'})
        });
    },
  }

})
