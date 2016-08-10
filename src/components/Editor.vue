<style lang="stylus" >
.editor-wrap
 .CodeMirror
  height 100% 
</style>
<style lang="stylus" scoped>
.editor-wrap
 width 100%
 height 100%
 max-height 100%
 position relative
 .toolbar
 	height 34px
 .editor
 	height calc(100% - 34px)
 	height 100%
</style>
<template>
  <section class="editor-wrap">
    <div class="editor" v-el:editor></div>
  </section>
</template>
<script>
import CodeMirror from 'codemirror'
import Parser from './parser'
import store from 'store'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/mode/css/css'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/mdn-like.css'
import './mode-questions'
import './editor.styl'

const template =
`题型：单选
技能：常识
难度：中
1.[单选][常识]以下图片是哪个公司的logo？
A.百一测评
B.腾讯
C.百度
D.阿里巴巴
答案：A
解析：很明显这个图标是百一测评！【对该题的解释，查询答案时显示，若无本行可删掉，下同】
2.[多选]以下哪些月份有31天？
A.1月
B.2月
C.3月
D.4月
答案：AC
3.[不定项]以下说法正确的有？
A.7月有30天
B.8月有30天
C.2014年2月有28天
D.2月有28天
答案：C
4.[判断]2014年2月有28天。
答案：正确
5.[填空]2015年的前三个月依次分别有 31 天， 28 天，和 31 天（请输入阿拉伯数字）。 
答案形式：完全一致
6.[问答]一年哪几个月有31天？
参考答案：1月、3月、5月、7月、8月、10月、12月
难度：难`



let editor = null
let parser = null
let updateHandler = null
export default {
  data () {
    return {
    	value: store.get('editor') || template
    }
  },
  ready () {
  	let self = this

  	editor = CodeMirror(this.$els.editor, {
        textWrapping: true,
        lineNumbers: true,
        tabMode: 'spaces',
        lineWrapping: 'true',
        mode: 'questions',
        theme: 'editor',
        indentUnit: 4,
        value: store.get('editor') || template,
        cursorHeight: .7,
        autofocus: true,
        pollInterval: 1000
  	})

	parser = new Parser(editor, {
		delay: 500,
		onChange() {
			self.value = editor.getValue()
  			store.set('editor', self.value)
  			self.$emit('update', parser.data)
		}
	})

	editor.on('scroll', function(cm) {
		let info = cm.getScrollInfo()
		let percent = info.top / (info.height - info.clientHeight) // 分母为零不会触发scroll
		self.$emit('scroll', percent)
	})

  	CodeMirror.signal(editor, 'change')
  }
}
</script>
