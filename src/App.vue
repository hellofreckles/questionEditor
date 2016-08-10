<style lang="stylus">
  @import "./app.styl"
</style>

<template>
  <div id="app">
    <div class="main-left">
      <editor 
      @update="updateData"
      @scroll="scrollRender"
      ></editor>
    </div>
    <!-- <div id="handler"></div> -->
    <div class="main-right">
      <editor-render 
      :render-data="renderData"
      :scroll-percent="scrollPercent"
      ></editor-render>
    </div>
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
      scrollRender(percent) {
        this.scrollPercent = percent
      },
      updateData(value) {
        this.renderData = _.assign({}, value)
      }
    },
    data() {
      return {
        renderData: {},
        scrollPercent: 0,
      }
    },
    ready(){  }
  }
</script>

