<template>
	<div class="editor-render-wrap" v-el:container>
		<div class="config-wrap" v-if="hasConfig">
			<ul>
				<li v-for="value in renderData.configs">
					<span>{{ $key | keyFilter}}：</span>{{ value }}
				</li>
			</ul>
		</div>
		<div class="question-wrap">
			<ul>
				<li v-for="(index, q) in renderData.questions" class="q-item">
					<a :href="'#question' + index"></a>
					<div class="q-seq">{{index + 1}}</div>
					<div class="q-content">
						<div class="q-baseinfo">
							<span class="q-type">[ {{q.questionType}} ]</span>
							<span class="q-skill">{{q.questionSkill}}</span>
							<span class="q-difficulty">{{q.difficulty}}</span>
						</div>
						<pre>{{q.title}}</pre>
						<ul class="q-options-wrap">
							<li class="q-option"
							v-for="(optionIndex, content) in q.options">
							<span class="option-icon" :class="optionStyle(optionIndex, q)"></span>
							<span class="option-index">{{getOptionIndex(optionIndex)}}</span>
							<pre class="option-content">{{content}}</pre>
						</li>
						<div class="property-config" v-if="q.answerExplain">
							<span class="property-key">解析：</span>
							<pre class="property-value">{{q.answerExplain}}</pre>
						</div>

					</ul>				
				</div>
			</li>
		</ul>
		<hr>
		<!-- <pre>{{ plain }}</pre> -->
		
	</div>
</div>
</template>
<script>
import $ from "jquery"

	const keyMap = {
		questionType: '题型',
		questionSkill: '技能',
		difficulty: '难度'
	}

	let $container

	export default {
		props: {
			renderData: {
				type: Object,
				default(){
					return {
						configs: {},
						questions: []
					}
				}
			},
			scrollPercent: {
				type: Number,
				default: 0
			}
		},
		computed: {
			hasConfig() {
				return Object.keys(this.renderData.configs || {}).length
			},
			plain() {
				return JSON.stringify(this.renderData, null, '  ')
			}
		},
		methods: {
			getOptionIndex(index) {
				return String.fromCharCode('A'.charCodeAt() + index)
			},
			optionStyle(index, qData) {
				let type = qData.questionType
				let styles = []
				if(type === '单选' || type === '判断') {
					styles.push('single')
				} else {
					styles.push('multiple')
				}
				if (qData.refAnswer) {
					let currOpt = String.fromCharCode('A'.charCodeAt() + index)
					if(qData.refAnswer.optAnswer.indexOf(currOpt) != -1) {
						styles.push('active')
					}
				}
				return styles
			}
		},
		watch: {
			scrollPercent(val) {
				 $(this.$el).stop().animate({
                    scrollTop: this.$el.scrollHeight * val
                }, 50);	
			},
			renderData(val) {
				// console.log(JSON.stringify(val))
			}
		},
		filters: {
			keyFilter(value) {
				return keyMap[value] || ''
			}
		},
		data() {
			return {
			}
		},
		ready() {
			$container = $(this.$el)
		}
	}
</script>
<style src="./render.styl" lang="stylus" scoped></style>
