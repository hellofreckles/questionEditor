<style lang="stylus">
  @import "./app.styl"
</style>

<template>
  <div id="app">
    <!-- <img class="logo" src="./assets/logo.png"> -->
    <div class="main-left">
    <editor @update="updateData"></editor>
    </div>
    <div id="handler"></div>
    <div class="main-right">
      <editor-render :render-data="renderData"></editor-render>
    </div>
   <!--  <p>
      Welcome to your Vue.js app!
    </p>
    <p>
      To get a better understanding of how this boilerplate works, check out
      <a href="http://vuejs-templates.github.io/webpack" target="_blank">its documentation</a>.
      It is also recommended to go through the docs for
      <a href="http://webpack.github.io/" target="_blank">Webpack</a> and
      <a href="http://vuejs.github.io/vue-loader/" target="_blank">vue-loader</a>.
      If you have any issues with the setup, please file an issue at this boilerplate's
      <a href="https://github.com/vuejs-templates/webpack" target="_blank">repository</a>.
    </p>
    <p>
      You may also want to checkout
      <a href="https://github.com/vuejs/vue-router/" target="_blank">vue-router</a> for routing and
      <a href="https://github.com/vuejs/vuex/" target="_blank">vuex</a> for state management.
    </p> -->
  </div>
</template>


<script>
  import Editor from './components/Editor'
  import EditorRender from './components/EditorRender'
  import 'bootstrap/dist/css/bootstrap.css'
  import _ from 'lodash'
  export default {
    components: {
      Editor,
      EditorRender
    },
    methods: {
      updateData(value) {
        this.renderData = _.assign({}, value)
        // console.log(JSON.stringify(value))
      }
    },
    data() {
      return {
        renderData: {}
      }
    },
    ready(){  }
  }
</script>

