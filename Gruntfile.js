module.exports = function(grunt) {
	var bundles = getBundles();

	grunt.initConfig({
		mochaTest: {
			test: {
				options: {
		        	reporter: 'spec'
		        },
		        src: 'test/**/*.js'
			}
		},
		mocha: {
			test: {
				src: 'test_html/**/*.html',
				options: {
					run: true,
					log: true,
					reporter: 'Spec'
				}
			}
		},
		browserify: {
			milo: {
				files: {
					'milo.bundle.js': 'lib/milo.js'
				},
				options: {
					transform: ['brfs']
				}
			},
			test1: {
				options: {
					debug: true
				}, 
				files: {
					'test_html/bind_test.bundle.js': 'test_html/bind_test/*.js'
				}
			},
			tests: {
				files: [{
                    expand: true,
                    src: 'test_browser/**/*.js',
                    dest: '.tmp-test-browser'
                }]
			}
		},
		watch: {
			milo: {
				files: ['lib/**/*.js', 'node_modules/mol-proto/lib/proto.js'],
				tasks: 'browserify:milo'
			},
			test1: {
				files: [
					'lib/**/*.js', 
					'node_modules/mol-proto/lib/proto.js', 
					'test_html/bind_test/*.js'
				],
				tasks: 'browserify:test1'
			},
			tests: {
				files: [
					'lib/**/*.js',
					'node_modules/mol-proto/lib/proto.js', 
					'test_browser/**/*.js'
				],
				tasks: 'browserify:tests'
			}
		}
		// concat: {
		// 	options: {
		// 		separator: ';',
		// 	},
		// 	dist: {
		// 		src: ['lib/bndr.js'],
		// 		dest: 'bndr.js'
		// 	}
		// },
		// uglify: {
		// 	build: {
		// 		src: 'bndr.js',
		// 		dest: 'bndr.js'
		// 	}
		// },

	});

	//grunt.loadNpmTasks('grunt-contrib-concat');
	//grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-mocha');

	grunt.registerTask('test', 'mochaTest');
	grunt.registerTask('htmltest', ['browserify:test1', 'watch']);
	grunt.registerTask('default', ['test', 'browserify', 'watch']);
	grunt.registerTask('skiptest', ['browserify', 'watch']);

	function getBundles() {
        return {
        };
    }
};