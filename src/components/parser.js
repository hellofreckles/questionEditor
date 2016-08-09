/**
 * @autho 赵大欣
 * 文档参考：http://codemirror.net/
 */
 function getDefaultData() {
 	return {
 		configs: {},
 		questions: []
 	}
 }

 let widgetsCache = []

 function clearWidgets(widgets) {
 	if(!widgets) {
 		return
 	}
 	if(_.isArray(widgets)) {
 		// widgets.forEach(widget => widget.clear())
 		for(let i = 0; i < widgets.length; i++) {
 			widgets[i].clear()
 			widgets[i] = null
 		}
 		widgets.length = 0
 	} else {
 		widgets.clear()
 	}
 }

 function addLineHint(doc, lineNumber, hint, style) {
 	let div = document.createElement('div')
 	div.innerHTML = hint
 	div.setAttribute('class', 'hint ' + (style || 'danger'))
 	return doc.addLineWidget(lineNumber, div)
 }

 // function addLineHint(doc, lineInfo, hint, style) {
 // 	let div = document.createElement('div')
 // 	div.innerHTML = hint
 // 	div.setAttribute('class', 'hint ' + (style || 'danger'))// = 'hint ' + (style || 'danger')
 // 	return doc.addLineWidget(lineNumber, div)
 // }

 function match(regExp) {
 	return function(lineInfo) {
		regExp.lastIndex = 0 // reset
		return regExp.test(lineInfo.text)
	}
}


let matchComment = match(/^\/\//)
let matchBlank = match(/^\s*$/)
let matchSectionConfig = match(/.*[:：].*/)
let matchQuestionBegin = match(/^\d+[\.、][^\s]+/)
let matchQuestionTitle = match(/\d+[\.、]/)
let matchQuestionOption = match(/^[A-Z][\.\、\s]/)
let matchQuestionProperty = function(questionType) {
	switch(questionType) {
		case '单选':
		case '多选':
		case '判断':
		case '不定项':
		return match(/^(答案|难度|解析)[:：].+/)
		// case '不定项问答':
		// case '多选问答':
		// case '单选问答':
		// return match(/^(答案|参考答案|难度|解析)[:：].+/)
		case '问答':
		return match(/^(难度|参考答案)[:：].+/)
		// case '视频':
		// case '音频':
		// return match(/^(难度)[:：].+/)
		// case '编程':
		// return match(/^(编程语言|难度|解析)[:：].+/)
		case '填空':
		return match(/^(填空数|参考答案\d+|答案形式|难度|解析)[:：].+/)
	}
}

const questionTypes = new Set() // 题型
const difficultyValues = new Set() // 难度值
const sectionConfigs = new Map() // 全局设置
const questionTypeConfig = new Map() // 题型信息

!["单选","多选","不定项","判断","问答","填空"].forEach(x => questionTypes.add(x))
!["低", "中", "高"].forEach(x => difficultyValues.add(x))
sectionConfigs.set("题型", { key: 'questionType', value: questionTypes })
.set("技能", { key: 'questionSkill' })
.set("难度", { key: 'difficulty', value: difficultyValues })
questionTypeConfig
.set("单选", {
	choice: true, // 是否需要
	options: [2, 26],
	answer: {
		test: /^[A-Z]$/,
		msg: '单选题正确选项个数为<span>一个</span>'
	}
})
.set("判断", {
	answer: /^[(正确|错误)(对|错)(是|否)(√|×)]$/
})
.set("多选", {
	choice: true,
	options: [3, 26],
	multiple: true,
	answer: {
		test: /^[A-Z]{2,}$/,
		msg: '多选题正确选项<span>至少有两个</span>'
	}
})
.set("不定项", {
	choice: true,
	multiple: true,
	options: [2, 26],
	answer: {
		test: /^[A-Z]{1,}$/,
		msg: '不定项题正确选项<span>至少有一个</span>'
	}
})
.set("填空", {
	choice: false,
	answer: true
})
.set("问答", {
	choice: false,
})


// 状态接口
class State {
	constructor(context) {
		this.context = context
	}
	
	handle(lineText) {
		return
	}
	toString() {
		return this.constructor.name
	}
	//
	dispatch(lineText) {

	}
}

class SectionConfigState extends State {
	constructor(context) {
		super(context)
	}

	// 题型：单选
	handle(lineInfo) {
		lineInfo.text.match(/^(.*)[:：](.*)$/g)
		this.context.state = null
		
		let doc = this.context.doc
		let configKey = RegExp.$1.trim()
		let configValue = RegExp.$2.trim()
		let configInfo = sectionConfigs.get(configKey)
		let prevData = lineInfo.data 
		let returnData = {
			data: prevData,
			state: null,
		}

		if(configInfo) {
			// 如果已经存在该值，那么覆盖
			if(prevData.configs[configInfo.key]) {
				addLineHint(doc, lineInfo.line, configKey + '重复定义了')
				return returnData
			}
			if(!configValue) {
				addLineHint(doc, lineInfo.line, '请设置<span>' + configKey + '</span>的默认取值')
				return returnData
			}
			if(configInfo.value) {
				if(configInfo.value.has(configValue)) {
					prevData.configs[configInfo.key] = configValue		
				} else {
					delete prevData.configs[configInfo.key]
					addLineHint(doc, lineInfo.line, configKey + '的范围：' + [...configInfo.value])
				}
			} else {
				prevData.configs[configInfo.key] = configValue		
			}
		} else {
			addLineHint(doc, lineInfo.line, '不识别的属性')
		}

		
		return returnData
	}

}

class QuestionBeginState extends State {
	constructor(context) {
		super(context)
	}

	// 1.[单选][公司文化]以下图片是哪个公司的logo？
	handle(lineInfo) {
		
		if(lineInfo.dispatch) {
			lineInfo.dispatch = false
			return this.dispatch(lineInfo)
		}
		this.context.state = null

		let matches = /^\d+[\.、](?:\[(.*?)\])?(?:\[(.*?)\])?(.*)$/g.exec(lineInfo.text)
		let questionType = matches[1]
		let questionSkill = matches[2]
		let title = matches[3]

		let prevData = lineInfo.data 
		let doc = this.context.doc
		let returnData = {
			state: null,
			data: prevData,
			dispatch: false
		}
		let qData = {
			ui: { // ui: 视图相关信息
				line: lineInfo.line
			},
			refAnswer: {}
		}
		prevData.questions.push(qData)


		// 设置了 题型 和 技能
		if(/^\d+[\.、]\[.*\]\s*\[.*\]/g.test(lineInfo.text)) {
			if(!questionTypes.has(questionType)) {
				addLineHint(doc, lineInfo.line, '请设置有效的题型：' + [...questionTypes])
				return returnData
			}
			if(!questionSkill) {
				addLineHint(doc, lineInfo.line, '请设置技能')
				return returnData
			}
		} else if(/^\d+[\.、]\[.*\]/g.test(lineInfo.text) && !questionTypes.has(questionType)) {
			addLineHint(doc, lineInfo.line, '请设置有效的题型：' + [...questionTypes])
			return returnData
		}

		questionType = questionType || prevData.configs.questionType
		questionSkill = questionSkill || prevData.configs.questionSkill

		if(!questionType) {
			addLineHint(doc, lineInfo.line, '请设置有效的题型：' + [...questionTypes])
			return returnData
		}

		returnData.state = this
		returnData.dispatch = true
		
		qData.questionType = questionType
		qData.questionSkill = questionSkill
		qData.difficulty = prevData.configs.difficulty || '中'
		qData.title = title
		return returnData
	}

	dispatch(lineInfo) {
		// 如果是选择题，那么要匹配选项
		// 否则要匹配题目属性
		// 否则要匹配一道新的题目
		// 否则作为题干
		let prevData = lineInfo.data
		let qData = _.last(prevData.questions)
		let questionType = qData.questionType
		let typeInfo = questionTypeConfig.get(questionType)
		if(typeInfo.choice && matchQuestionOption(lineInfo)) {
			this.context.state = this.context.optionBeginState
		} else if(matchQuestionProperty(questionType)(lineInfo)) {
			this.context.state = this.context.questionPropertyBeginState
		} else if(matchQuestionBegin(lineInfo)) {
			this.context.state = this.context.questionBeginState
		} else {
			this.context.state = this.context.questionTitleState
		}

		return this.context.state.handle(lineInfo)
	}
}

class QuestionTitleState extends State {
	constructor(context) {
		super(context)
	}

	handle(lineInfo) {
		if(lineInfo.dispatch) {
			lineInfo.dispatch = false
			// return this.context.questionBeginState.dispatch.call(this, lineInfo)
			return this.context.questionBeginState.dispatch(lineInfo)
		}

		let doc = this.context.doc
		let prevData = lineInfo.data 
		let qData = _.last(prevData.questions)
		let returnData = {
			state: this,
			data: prevData,
			dispatch: true
		}
		qData.title += ('\n' + lineInfo.text)
		return returnData
	}

}
class OptionBeginState extends State {
	constructor(context) {
		super(context)
	}

	handle(lineInfo) {
		if(lineInfo.dispatch) {
			lineInfo.dispatch = false
			return this.dispatch(lineInfo)
		}
		let doc = this.context.doc

		let matches = /^[A-Z][\.\、\s](.*)$/g.exec(lineInfo.text)
		let optionContent = matches[1]

		let prevData = lineInfo.data 
		let qData = _.last(prevData.questions)
		let options = qData.options
		if(!qData.options) {
			options = qData.options = []
			qData.refAnswer.optAnswer = ''
		}
		let returnData = {
			state: this,
			data: prevData,
			dispatch: true
		}

		options.push(optionContent)
		return returnData
	}

	dispatch(lineInfo) {
		let prevData = lineInfo.data
		let qData = _.last(prevData.questions)
		let questionType = qData.questionType
		let typeInfo = questionTypeConfig.get(questionType)
		if(matchQuestionOption(lineInfo)) {
			prevData.dispatch = false
			this.context.state = this.context.optionBeginState
		} else if(matchQuestionProperty(questionType)(lineInfo)) {
			this.context.state = this.context.questionPropertyBeginState
		} else if(matchQuestionBegin(lineInfo)) {
			this.context.state = this.context.questionBeginState
		} else {
			this.context.state = this.context.optionContentState
		}

		return this.context.state.handle(lineInfo)
	}
}
class OptionContentState extends State {
	constructor(context) {
		super(context)
	}

	handle(lineInfo) {
		if(lineInfo.dispatch) {
			lineInfo.dispatch = false
			return this.context.optionBeginState.dispatch.call(lineInfo)
			// return this.context.optionBeginState.dispatch.call(this, lineInfo)
		}

		let doc = this.context.doc
		let prevData = lineInfo.data 
		let qData = _.last(prevData.questions)
		let options = qData.options
		let returnData = {
			state: this,
			data: prevData,
			dispatch: true
		}
		options[options.length - 1] += ('\n' + lineInfo.text)
		return returnData
	}

}
class QuestionPropertyBeginState extends State {
	constructor(context) {
		super(context)
	}

	handle(lineInfo) {
		if(lineInfo.dispatch) {
			lineInfo.dispatch = false
			return this.dispatch(lineInfo)
		}
		let doc = this.context.doc
		let matches = /^(.*)[:：](.*)$/g.exec(lineInfo.text)
		let propertyKey = matches[1]
		let propertyValue = matches[2].trim()

		let prevData = lineInfo.data 
		let qData = _.last(prevData.questions)
		let questionType = qData.questionType
		let typeInfo = questionTypeConfig.get(questionType)

		if(propertyKey === '答案') {
			if (typeInfo.choice) {
				let options = qData.options
				let optionCount = options && options.length || 26
				let ansInfo = typeInfo.answer
				let formatAnswer = _.remove(_.uniq(propertyValue.toUpperCase().split('').sort()), function(x) {
					return new RegExp('[A-' + String.fromCharCode('A'.charCodeAt() + optionCount) + ']', 'i').test(x)
				}).join('')
				ansInfo.test.lastIndex = 0
				if(formatAnswer && ansInfo.test.test(formatAnswer)) {
					if(formatAnswer !== propertyValue) {
						addLineHint(doc, lineInfo.line, '答案已帮您解析为：' + formatAnswer, 'info')
					}
				} else {
					addLineHint(doc, lineInfo.line, '答案解析错误：' + ansInfo.msg)
				}
				qData.refAnswer.optAnswer = propertyValue
			}
		}

		// console.log(doc.getEditor().lineInfo(lineInfo.line))


		let returnData = {
			state: this,
			data: prevData,
			dispatch: true
		}
		
		return returnData
	}

	dispatch(lineInfo) {
		let prevData = lineInfo.data
		let qData = _.last(prevData.questions)
		let questionType = qData.questionType
		let typeInfo = questionTypeConfig.get(questionType)
		if(matchQuestionOption(lineInfo)) {
			prevData.dispatch = false
			this.context.state = this.context.optionBeginState
		} else if(matchQuestionProperty(questionType)(lineInfo)) {
			this.context.state = this.context.questionPropertyBeginState
		} else if(matchQuestionBegin(lineInfo)) {
			this.context.state = this.context.questionBeginState
		} else {
			this.context.state = this.context.optionContentState
		}

		return this.context.state.handle(lineInfo)
	}
	
}

class QuestionPropertyContentState extends State {
	constructor(context) {
		super(context)
	}

	handleContent(stream, modeState) {
		stream.skipToEnd()
		resetState(modeState)
		return 'line-property property-value'
	}

	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.context.questionPropertyBeginState.dispatch.call(this, stream, modeState)
		}
		return this.handleContent(stream, modeState)
	}

}

class Context {
	sectionConfigState // 全局设置
	questionBeginState // 题目开始
	questionTitleState // 纯题干
	optionBeginState // 选项开始
	optionContentState // 纯选项内容
	questionPropertyBeginState // 题目属性
	questionPropertyContentState // 纯题目属性值

	state // current state

	constructor() {
		this.sectionConfigState = new SectionConfigState(this)
		this.questionBeginState = new QuestionBeginState(this)
		this.questionTitleState = new QuestionTitleState(this)
		this.optionBeginState = new OptionBeginState(this)
		this.optionContentState = new OptionContentState(this)
		this.questionPropertyBeginState = new QuestionPropertyBeginState(this)
		this.questionPropertyContentState = new QuestionPropertyContentState(this)
	}

	request(lineInfo) {
		
		let returnData = {
			data: lineInfo.data,
			state: lineInfo.state,
			dispatch: lineInfo.dispatch
		}
		let hasQuestion = lineInfo.data.questions && lineInfo.data.questions.length

		this.state = lineInfo.state 
		if(this.state) {
			return this.state.handle(lineInfo)
		}

		if(!hasQuestion && matchSectionConfig(lineInfo)) {
			this.state = this.sectionConfigState
		} else if(matchQuestionBegin(lineInfo)) {
			this.state= this.questionBeginState
		} else {
			return returnData
		}

		return this.state.handle(lineInfo)
	}
}

class Parser extends Context{

	editor // codemirror editor
	doc // codemirror doc
	value // editor value
	data // converted question object from value
	// index - lineNumber
	// value - 
	lineCache = []

	parseHandler
	delay = 500
	onChange() { }

	constructor(codeMirrorEditor, options) {
		super()
		this.editor = codeMirrorEditor
		this.doc = this.editor.getDoc()

		this.delay = options.delay || this.delay
		this.onChange = options.onChange || onChange
		this.bindEvent()
	}

	bindEvent() {
		let self = this
		let start
		let lock = false
		// {from, to, text, removed, origin}
		this.editor.on('change', function(codemirror, changeObj) {
			if(!lock) {
				lock = true
				start = changeObj && changeObj.from.line || 0
			}
			clearTimeout(self.parseHandler)
			self.parseHandler = setTimeout(function() {
				lock = false
				self.parse(start)
				self.onChange()
			}, self.delay)
		})
	}

	parse(changeStart) {
		let self = this
		let start = 0 || changeStart
		let end = this.doc.lineCount()
		let prev

		this.lineCache.length = start
		// end: not including
		this.doc.eachLine(start, end, function(lineHandle) {
			let lineNumber = this.doc.getLineNumber(lineHandle)
			let prev
			if(lineNumber > 0) {
				// note: cloneDeep here is important, or lineCache values shared common inner Object
				prev = _.cloneDeep(this.lineCache[lineNumber - 1], function(value){
					if (value instanceof State) {
						return value
					}
					return value
				})
			} else {
				prev = {
					data: getDefaultData()
				}
			}

			// 返回
			// 1. data - 以 当前行 为止解析的数据对象
			// 2. state - 解析 当前行 对应的 状态
			// 3. 更多作为 state 内部控制的参数...
			let result = this.parseLine(lineHandle, prev)
			
			this.lineCache[lineNumber] = result
		}.bind(this))

		this.data = this.lineCache[end - 1].data

	}

	parseLine(lineHandle, prev) {
		let lineInfo = this.editor.lineInfo(lineHandle)
		clearWidgets(lineInfo.widgets)
		return this.request(_.extend({}, prev, lineInfo))
	}

}

export default Parser