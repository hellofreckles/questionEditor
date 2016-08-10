/**
 * @autho 赵大欣
 * 文档参考：http://codemirror.net/doc/manual.html#modeapi
 */
 import CodeMirror from 'codemirror'



 CodeMirror.defineMode("questions", function(config, parserConfig) {
 	return {
 		startState() {
 			return {}
 		},
 		token(stream, state) {
 			if(state.isQuestionBegin) {
 				state.isQuestionBegin = false
 				stream.skipToEnd()
 				return null
 			}

 			if(/^\d+[\.、]/.test(stream.string)) {
 				stream.skipTo('.') || stream.skipTo('、')
 				state.isQuestionBegin = true
 				return 'question-seq'
 			}

 			stream.skipToEnd()
 			return null
 		},
 	};
 });
