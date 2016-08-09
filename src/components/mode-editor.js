import CodeMirror from 'codemirror'
import _ from 'lodash'

CodeMirror.defineMode("editor", function(config, parserConfig) {
	// 上下文对象：模拟栈结构
	class Context {
		constructor(type, prev) {
			this.type = type // 类型
    		this.prev = prev // 上一个状态对象
    	}
    }

    function pushContext(state, stream, type) {
    	state.context = new Context(type, state.context)
    	return type
    }

    function popContext(state) {
    	if (state.context.prev)
    		state.context = state.context.prev
    	return state.context.type
    }

    function pass(type, stream, state) {
    	return states[state.newcontext.type](type, stream, state);
    }

    function popAndPass(type, stream, state, n) {
    	for (var i = n || 1; i > 0; i--)
    		state.context = state.context.prev;
    	return pass(type, stream, state);
    }


    if (!parserConfig.propertyKeywords) {
    	parserConfig = CodeMirror.resolveMode("text/editor")
    }

    // let editor = config.getInstance()

    // let indentUnit = config.indentUnit,
    // tokenHooks = parserConfig.tokenHooks,
    // questionTypes = parserConfig.questionTypes;

    let type, override

    const TYPE = {
		section: 'section-wrap', // 部分
		question: 'question-wrap', // 题目
		option: 'question-option', // 选项
		content: 'content', // 题干 或 选项内容

	}

	function isType(type) {
		return function(typeValue) {
			return type === typeValue
		}
	}
	let isSection = isType(TYPE.section)
	let isQuestion = isType(TYPE.question)
	let isOption = isType(TYPE.option)
	let isContent = isType(TYPE.content)

	function matchLine(regExp) {
		return function(stream) {
			return new RegExp(regExp).test(stream.string)
		}
	}
	let matchQuestionTitle = matchLine("^\d+[\.、]")
	let matchQuestionOption = matchLine("^[A-Z][\.\、\s]")
	let matchQuestionProperty = matchLine("^.+[:：].+")
  	// utils ==========
  	//是否含有中文（也包含日文和韩文）
  	function isChineseChar(str) {   
  		var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
  		return reg.test(str);
  	}
	//同理，是否含有全角符号的函数
	function isFullwidthChar(str) {
		var reg = /[\uFF00-\uFFEF]/;
		return reg.test(str);
	} 

	function contentParser(stream, state) {

	}
	

	function questionParser(stream, state) {
		if(state.args.skip) {
			if(matchQuestionTitle(stream)) {
				state.args.skip = false
				state.suppose = 'title'
				return pushContext(state, stream, TYPE.question)
			} else {
				stream.skipToEnd()
				return null
			}
		}
		
		if(state.suppose === 'title') {
			if(stream.skipTo('.') || stream.skipTo('、')) {
				stream.next()
				stream.eatWhile(/\s+/)
				if(stream.match(/\[.*\]/, false)) {
					state.suppose = 'config'
				} else {
					state.suppose = 'title-content'
				}
				return 'question-seq'
			} else {
				stream.skipToEnd()
				stream.next()
				return null
			}
		}
		if(state.suppose === 'config') {
			// 格式：[题型][技能]题干题干题干题干
			// 1 如果有两对[], 则分别是 题型 技能
			// 2 如果有一对[], 则为 题型
			if(stream.match(/\s*\[.*\]\s*\[.*\].*/, false)) {
				state.suppose = 'config-question-type'
				state.args.questionConfigs = 2
				delete state.args.bracket
				stream.skipTo('[')
				if(stream.match(/\[\s*\]/, false)) {
					stream.next()
					return 'type-required-in-bracket'
				}
				stream.next()
				return 'bracket'
			} else if (stream.match(/\s*\[.*\].*/, false)) {
				state.suppose = 'config-question-type'
				state.args.questionConfigs = 1
				delete state.args.bracket
				stream.skipTo('[')
				if(stream.match(/\s*\[\s*\]/, false)) {
					stream.next()
					return 'bracket type-required-in-bracket'
				}
				stream.next()
				return 'bracket'
			} else {
				stream.skipToEnd()
				state.args.skip = true
				return 'title-content'
			}
		}
		if(state.suppose === 'config-question-type') {
			if(state.args.bracket) {
				delete state.args.bracket
				if(state.args.questionConfigs === 2) {
					state.suppose = 'config-question-skill'
				} else {
					state.suppose = 'title-content'
				}
				stream.skipTo(']')
				stream.next()
				return 'bracket'
			}
			state.args.bracket = true
			stream.skipTo(']')
			let questionType = stream.current().trim()
			if(!questionType) {
				return null
			} else if(questionTypes.has(questionType)) {
				return 'question-type'
			} else {
				return 'err-question-type'
			}
			return 'question-type'
		}

		if(state.suppose === 'config-question-skill') {
			if(state.args.bracket) {
				state.args.bracket = false
				stream.skipTo(']')
				stream.next()
				state.suppose = 'title-content'
				state.questionTitle = []
				return 'bracket'
			}
			if(stream.match(/\s*\[\s*\]/, false)) {
				stream.skipTo('[')
				stream.next()
				state.args.bracket = true
				return 'bracket skill-required-in-bracket'
			}
			if(stream.match(/\s*\[/, false)) {
				stream.skipTo('[')
				stream.next()
				return 'bracket'
			}
			if(stream.skipTo(']')) {
				state.args.bracket = true
			}
			
			let questionSkill = stream.current().trim()
			if(!questionSkill) {
				stream.next()
				return null
			}

			return 'question-skill'
		}

		if(state.suppose === 'title-content') {
			if(matchQuestionOption(stream)) {
				state.suppose = 'option'
				return 'option-seq line-option'
			}
			stream.skipToEnd()
			return 'question-title'
		}

		if(state.suppose === 'option') {
			stream.skipTo('.') || stream.skipTo('、')
			stream.next()
			state.suppose = 'option-content'
			return 'option-seq line-option'
		}

		if(state.suppose === 'option-content') {
			if(stream.sol() && matchQuestionOption(stream)) {
				state.suppose = 'option'
				return null
			}
			if(stream.sol() && matchQuestionProperty(stream)) {
				stream.skipTo('：') || stream.skipTo(':')
				let property = stream.current().trim()
				if(questionProperty.has(property)) {
					stream.next()
					state.suppose = 'property-value'
					state.args.property = property
					return 'property-key'
				} 
			}
			stream.skipToEnd()
			return 'line-option option-content'
		}

		if(state.suppose === 'property-value') {
			stream.skipToEnd()
			let property = state.args.property
			let value = stream.current().trim()
			let valueInfo = questionProperty.get(property)
			if(valueInfo.validate) { 
				if(!valueInfo.value.has(value)) {
					return 'err-' + valueInfo.style
				}
			}
			if(!valueInfo.multiple) {
				debugger
				stream.next()
				state.suppose = '?'
			}
			return 'property-value'
		}

		stream.next()
		return null
	}

	function optionParser(stream, state) {
		let styles = ['line-option']

		if(state.suppose === 'content') {
			stream.skipToEnd()
			state.optionContent.push(stream.current())
		}

		if(stream.match(/[A-Z][\.\、\s]/, false)) { // new option
			state.args.option = true
			stream.skipTo('.') ||
			stream.skipTo('、') ||
			stream.skipTo('\s')
			stream.next()
			styles.push('option-seq')
			state.suppose = 'content'
			state.optionContent = []
			popContext(state)
			pushContext(state, stream, TYPE.option)
			return styles.join(' ')
		}

		stream.skipToEnd()
		console.log(stream)
	}

	function sectionParser(stream, state) {
		if(state.suppose === 'config') {
			if(stream.match(/\d+[\.、]/, false)) {
				state.suppose = 'title'
				return pushContext(state, stream, TYPE.question) // from sectionConfig to question
			}
			if(stream.match(/.*[:：].*/, false)) {
				let configKey
				let styles = ['line-section-config']
				let hasError = false

				stream.skipTo('：') || stream.skipTo(':')
				configKey = stream.current().trim()
				styles.push('section-config-key')

				if(sectionConfigs.has(configKey)) { // 是否是可识别的属性
					state.suppose = 'config-value'
					state.args.configKey = configKey
					stream.next()
				} else {
					hasError = true
					styles.push('err-unknown')
					stream.skipToEnd()
				}

				if (!hasError && stream.peek() == null) { // end of line
					stream.next()
					styles.push(['err-blank'])
				}
				return styles.join(' ')
			}
			stream.skipToEnd()
			return null
		}
		if(state.suppose === 'config-value') {
			if(stream.sol()) {
				state.suppose = 'config'
				return null
			}

			let configKey = state.args.configKey
			stream.skipToEnd()
			state.suppose = 'config'

			let value = stream.current().trim()
			if(!value) {
				return 'section-config-value err-blank'
			}
			let configValueInfo = sectionConfigs.get(configKey)
			if(configValueInfo.validate) { 
				if(!configValueInfo.value.has(value)) {
					return 'section-config-value err-' + configValueInfo.style
				}
			}
			return 'section-config-value'
		}
	}


	// [section] -> title -> config
	//					-> [question]
	//			 -> [section]
	// [question]
	return {
		startState(base) {
			return {
				instance: config.dom.querySelector('.CodeMirror').CodeMirror,
				// state: null,
				args: {},
				data: {
					sections : []
				},
				context: null
			}
		},
		token(stream, state) {

			// let doc = state.instance.getDoc()
			// let editor = doc.getEditor()
			// conso/le.log(JSON.stringify(state.data))
			// assume current context is section
			if(stream.match(/\s*\/\//, false)) { 
				stream.skipToEnd()
				return 'comment'	
			}
			if(!state.context) { 
				if(stream.match(/.*[:：].*/, false)) {
					state.suppose = 'config'
					state.context = new Context(TYPE.section, null)
					return null
				} else if(stream.match(/\d+[\.、]/, false)) { 
					state.context = new Context(TYPE.question, null)
					return null
				} else {
					stream.skipToEnd()
					return null
				}
			}
			if(isSection(state.context.type)) {
				return sectionParser(stream, state)
			}
			if(isQuestion(state.context.type)) {
				return questionParser(stream, state)
			}
			if(isOption(state.context.type)) {
				return optionParser(stream, state)
			}
			stream.next();
			return null
		},
		indent: function(state, textAfter) {
			return 0
		},
	};
});


const questionTypes = new Set() // 题型
const languages = new Set() // 编程语言
const difficultyValues = new Set() // 难度值
const sectionConfigs = new Map() // 全局设置
const questionProperty = new Map() // 试题属性

!["单选","多选","判断","问答","填空","编程","不定项","音频","视频",
"单选问答","多选问答","不定项问答","组合"].forEach(x => questionTypes.add(x))
!["Java","C","C++","ObjectiveC","Python","Shell","JavaScript","PHP",//
"Perl","Ruby","C#","SQL","Web","Other"].forEach(x => languages.add(x))
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

CodeMirror.defineMIME("text/editor", {
	// questionTypes: questionTypes,
	name: "editor"
});






