/**
 * @autho 赵大欣
 * 文档参考：http://codemirror.net/doc/manual.html#modeapi
 */
 import CodeMirror from 'codemirror'
 import _ from 'lodash'

const questionTypes = new Set() // 题型
const languages = new Set() // 编程语言
const difficultyValues = new Set() // 难度值
const sectionConfigs = new Map() // 全局设置
const questionProperty = new Map() // 试题属性
const questionTypeConfig = new Map() // 题型信息

// !["单选","多选","判断","问答","填空","编程","不定项","音频","视频","单选问答","多选问答","不定项问答"]
!["单选","多选","不定项","判断","问答","填空"]
.forEach(x => questionTypes.add(x))
// !["Java","C","C++","ObjectiveC","Python","Shell","JavaScript","PHP","Perl","Ruby","C#","SQL","Web","Other"]
// .forEach(x => languages.add(x))
!["低", "中", "高"].forEach(x => difficultyValues.add(x))
sectionConfigs
.set("题型", {
	validate: true,
	style: 'question-type',
	value: questionTypes
})
.set("技能", {validate: false})
.set("难度", {
	validate: true,
	style: 'difficulty',
	value: difficultyValues
})

questionProperty
.set("答案", { 
	validate: false, 
	multiple: true // 允许多行
})
.set("难度", {
	validate: true,
	style: 'difficulty',
	value: difficultyValues
})
.set("解析", { validate: false })
.set("参考答案", { 
	validate: false,
	multiple: true 
})
.set("答案形式", { validate: false })
.set("编程语言", { validate: false })

questionTypeConfig
.set("单选", {
	choice: true,
	options: [2, 26],
	answer: true
})
.set("多选", {
	choice: true,
	answer: true
})
.set("判断", {
	choice: true,
	answer: true
})
.set("填空", {
	choice: false,
	answer: true
})
.set("问答", {
	choice: false,
})
.set("不定项", {
	choice: true,
	answer: true
})

function match(regExp) {
	return function(stream) {
		regExp.lastIndex = 0 // reset
		return regExp.test(stream.string)
	}
}
let matchComment = match(/^\/\//)
let matchSectionConfig = match(/.*[:：].*/)
let matchQuestionBegin = match(/^\d+[\.、]/)
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


const reservedKeys = {
	context: 1,
	data: 1,
	state: 1,
}

function resetState(state) {

	for(let _prop of Reflect.ownKeys(state).values()) {
		if(!(_prop in reservedKeys)) {
			delete state[_prop]	
		}
	}
	state.new = true
	return state
}


// 状态机
// 定义各种状态
// 每个 stream 都代表一种确定的状态
class Context {
	sectionConfigState // 全局设置
	questionBeginState // 题目开始
	questionTitleState // 纯题干
	optionBeginState // 选项开始
	optionContentState // 纯选项内容
	questionPropertyBeginState // 题目属性
	questionPropertyContentState // 纯题目属性值

	toString() {
		return this.state.toString()
	}

	constructor() {
		this.sectionConfigState = new SectionConfigState(this)
		this.questionBeginState = new QuestionBeginState(this)
		this.questionTitleState = new QuestionTitleState(this)
		this.optionBeginState = new OptionBeginState(this)
		this.optionContentState = new OptionContentState(this)
		this.questionPropertyBeginState = new QuestionPropertyBeginState(this)
		this.questionPropertyContentState = new QuestionPropertyContentState(this)
	}

	request(stream, modeState) {
		// modeState 保存了每个stream的副本
		// 所以在编辑器内更改任意位置时，先要通过 modeState 取出对应的状态
		if(matchComment(stream)) { 
			stream.skipToEnd()
			return 'comment'	
		}

		if(modeState.state) {
			return modeState.state.handle(stream, modeState)
		}

		if(matchSectionConfig(stream)) {
			modeState.state = this.sectionConfigState
		} else if(matchQuestionBegin(stream)) {
			modeState.state= this.questionBeginState
		} else {
			stream.skipToEnd()
			return null
		}

		return modeState.state.handle(stream, modeState)
	}
}

// 状态接口
// 用来描述当前stream的状态
class State {
	constructor(context) {
		this.context = context
	}
	// 返回 classList
	handle(stream, modeState) {
		stream.skipToEnd()
		return null
	}
	toString() {
		return this.constructor.name
	}
	//
	dispatch(stream) {

	}

}

class SectionConfigState extends State {
	constructor(context) {
		super(context)
	}

	handleConfigKey(stream, modeState) {
		stream.skipTo('：') || stream.skipTo(':')
		let configKey = stream.current().trim()
		let styles = ['section-config-key']
		if(sectionConfigs.has(configKey)) { // 是否是可识别的属性
			modeState.suppose = 'config-value'
			modeState.data.configKey = configKey
			stream.next()
			if (stream.eol() == null) { // end of line
				stream.next()
				styles.push('err-blank')
				resetState(modeState)
			}
		} else {
			styles.push('err-unknown')
			stream.skipToEnd()
			resetState(modeState)
		}

		return styles.join(' ')
	}

	handleConfigValue(stream, modeState) {
		stream.skipToEnd()
		let configKey = modeState.data.configKey
		let styles = ['section-config-value']
		let value = stream.current().trim()
		if(!value) {
			styles.push('err-blank')
		} else {
			let configValueInfo = sectionConfigs.get(configKey)
			if(configValueInfo.validate) { 
				if(!configValueInfo.value.has(value)) {
					styles.push('err-' + configValueInfo.style)
				} else {
					modeState.data[configKey] = value
				}
			} else {
				modeState.data[configKey] = value
			}
		}
		resetState(modeState)

		return styles.join(' ')
	}

	// 题型：单选
	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.dispatch(stream, modeState)
		}
		if(modeState.suppose === 'config-value') {
			return this.handleConfigValue(stream, modeState)
		}
		return this.handleConfigKey(stream, modeState)
	}

	dispatch(stream, modeState) {
		if(matchSectionConfig(stream)) {
			modeState.state = this
		} else if(matchQuestionBegin(stream)) {
			modeState.state = this.context.questionBeginState
		} else {
			resetState(modeState)
			stream.skipToEnd()
			return null
		}
		return modeState.state.handle(stream, modeState)
	}

}
class QuestionBeginState extends State {
	constructor(context) {
		super(context)
	}

	handleLeftType(stream, modeState) {
		stream.skipTo('[')
		if(stream.match(/\[\s*\]/, false)) { // 类型为空
			stream.next()
			modeState.queue.shift()
			return 'type-required-in-bracket'
		}
		stream.next()
		return 'bracket'
	}

	handleType(stream, modeState) {
		stream.skipTo(']')
		let questionType = stream.current().trim()
		if(!questionType) {
			return null
		} else if(questionTypes.has(questionType)) {
			modeState.data.questionType = questionType
			return 'question-type'
		} else {
			return 'err-question-type'
		}
	}

	handleRightType(stream, modeState) {
		stream.skipTo(']')
		stream.next()
		if (stream.eol() == null) { // end of line
			resetState(modeState)
			stream.next()
		}
		return 'bracket'
	}

	handleLeftSkill(stream, modeState) {
		stream.skipTo('[')
		if(stream.match(/\[\s*\]/, false)) {
			stream.next()
			modeState.queue.shift()
			return 'skill-required-in-bracket'
		}
		stream.next()
		return 'bracket'
	}

	handleSkill(stream, modeState) {
		stream.skipTo(']')
		let questionType = stream.current().trim()
		if(!questionType) {
			return null
		} else {
			return 'question-skill'
		}
	}

	handleRightSkill(stream, modeState) {
		stream.skipTo(']')
		stream.next()
		if (stream.eol() == null) { // end of line
			resetState(modeState)
			stream.next()
		}
		return 'bracket'
	}

	handleContent(stream, modeState) {
		stream.skipToEnd()
		stream.next()
		modeState.data.questionType = modeState.data.questionType || modeState.data['题型']
		resetState(modeState)
		return 'question-title ' + modeState.data.questionType 
	}

	handleSeq(stream, modeState) {
		stream.skipTo('.') || stream.skipTo('、')
		stream.next()

		modeState.queue = []
		if(stream.match(/\s*\[.*\]\s*\[.*\].*/, false)) {
			modeState.queue = ['leftType', 'type', 'rightType', 'leftSkill', 'skill', 'rightSkill', 'content']
		} else if(stream.match(/\s*\[.*\].*/, false)) {
			modeState.queue = ['leftType', 'type', 'rightType', 'content']
		} else {
			modeState.queue = ['content']
		}

		return 'question-seq'
	}

	// 1.[单选][公司文化]以下图片是哪个公司的logo？
	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.dispatch(stream, modeState)
		}
		if(modeState.queue && modeState.queue.length) {
			let suppose = modeState.queue.shift()
			return this['handle' + _.upperFirst(suppose)](stream, modeState)
		}

		return this.handleSeq(stream, modeState)
	}

	dispatch(stream, modeState) {
		// 如果是选择题，那么要匹配选项
		// 否则要匹配题目属性
		// 否则要匹配一道新的题目
		// 否则作为题干
		let questionType = modeState.data.questionType
		let typeInfo = questionTypeConfig.get(questionType)
		if(typeInfo.choice && matchQuestionOption(stream)) {
			// if(matchQuestionOption(stream)) {
			modeState.state = this.context.optionBeginState
			// } else {
			// 	modeState.state = this.context.questionTitleState
			// }
		} else if(matchQuestionProperty(questionType)(stream)) {
			modeState.state = this.context.questionPropertyBeginState
		} else if(matchQuestionBegin(stream)) {
			resetState(modeState)
			modeState.new = false
			modeState.state = this.context.questionBeginState
		} else {
			modeState.state = this.context.questionTitleState
		}
		return modeState.state.handle(stream, modeState)
	}
}
class QuestionTitleState extends State {
	constructor(context) {
		super(context)
	}

	handleTitle(stream, modeState) {
		stream.skipToEnd()
		resetState(modeState)
		return 'question-title'
	}

	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.context.questionBeginState.dispatch.call(this, stream, modeState)
		}
		return this.handleTitle(stream, modeState)
	}

}
class OptionBeginState extends State {
	constructor(context) {
		super(context)
	}

	handleContent(stream, modeState) {
		stream.skipToEnd()
		resetState(modeState)
		return 'line-option option-content'
	}

	handleSeq(stream, modeState) {
		stream.skipTo('.') || stream.skipTo('、')
		stream.next()

		if (stream.eol() == null) { // end of line
			resetState(modeState)
			stream.next()
			return 'line-option option-seq'
		}
		modeState.suppose = 'option-content'
		return 'line-option option-seq'
	}

	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.dispatch(stream, modeState)
		}
		if(modeState.suppose === 'option-content') {
			return this.handleContent(stream, modeState)
		}

		return this.handleSeq(stream, modeState)
	}

	dispatch(stream, modeState) {
		let questionType = modeState.data.questionType
		if(matchQuestionBegin(stream)) {
			modeState.state = this.context.questionBeginState
		} else if(matchQuestionProperty(questionType)(stream)) {
			modeState.state = this.context.questionPropertyBeginState
		} else if (matchQuestionOption(stream)) {
			modeState.state = this.context.optionBeginState
		} else {
			modeState.state = this.context.optionContentState			
		}
		return modeState.state.handle(stream, modeState) 
	}
}
class OptionContentState extends State {
	constructor(context) {
		super(context)
	}

	handleContent(stream, modeState) {
		stream.skipToEnd()
		resetState(modeState)
		return 'line-option line-option-pure option-content'
	}

	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.context.optionBeginState.dispatch.call(this, stream, modeState)
		}
		return this.handleContent(stream, modeState)
	}

}
class QuestionPropertyBeginState extends State {
	constructor(context) {
		super(context)
	}

	handleValue(stream, modeState) {
		stream.skipToEnd()
		stream.next()
		resetState(modeState)
		return 'property-value'
	}

	handleProperty(stream, modeState) {
		stream.skipTo(':') || stream.skipTo('：')
		stream.next()
		let property = stream.current().trim()
		modeState.suppose = 'value'
		return 'property-key'
	}

	handle(stream, modeState) {
		if(modeState.new) {
			modeState.new = false
			return this.dispatch(stream, modeState)
		}
		if(modeState.suppose === 'value') {
			return this.handleValue(stream, modeState)
		}
		return this.handleProperty(stream, modeState)
	}

	dispatch(stream, modeState) {
		let questionType = modeState.data.questionType
		let typeInfo = questionTypeConfig.get(questionType)
		if(matchQuestionProperty(questionType)(stream)) {
			modeState.state = this.context.questionPropertyBeginState
		} else if(matchQuestionBegin(stream)) {
			// resetState(modeState)
			// modeState.new = false
			modeState.state = this.context.questionBeginState
		} else {
			modeState.state = this.context.questionPropertyContentState
		}
		return modeState.state.handle(stream, modeState)	
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

CodeMirror.defineMode("question", function(config, parserConfig) {
	return {
		startState() {
			return {
				context : new Context(),
				data: {},
				state: null
			}
		},
		token(stream, modeState) { // trigger
			return modeState.context.request(stream, modeState)
		},
	};
});

CodeMirror.defineMIME("text/question", {
	name: "question"
})






