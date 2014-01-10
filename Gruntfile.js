module.exports = function(grunt) {
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
				files: {
					'test_html/bind_test.bundle.js': 'test_html/bind_test/*.js'
				},
				options: {
					debug: true
				}
			},
			tests: {
				files: [{
                    expand: true,
                    src: 'test_browser/**/*.js',
                    dest: '.tmp-test-browser'
                }],
                options: {
					transform: ['brfs']
                }
			}
		},
		uglify: {
            options: {
                sourceMap: sourceMap,
                sourceMappingURL: sourceMappingURL,
                sourceMapRoot: '/',
                mangle: !grunt.option('no-mangle')
            },
			milo: {
				files: {
					'milo.min.js': 'milo.bundle.js'
				}
			}
		},
		karma: {
			unit: {
				configFile: 'karma.conf.js'
	    	}
		},
		watch: {
			milo: {
				files: [
					'lib/**/*.js',
					'node_modules/mol-proto/lib/**/*.js'
				],
				tasks: ['browserify', 'uglify'],
			},
			test1: {
				files: ['test_html/bind_test/*.js'],
				tasks: 'browserify:test1'
			},
			tests: {
				files: ['test_browser/**/*.{js,html}'],
				tasks: 'browserify:tests'
			}
		}
	});

    function sourceMap(dest) {
        return dest + '.map';
    }

    function sourceMappingURL(dest) {
        return sourceMap(dest.split('/').pop());
    }

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-mocha');
	grunt.loadNpmTasks('grunt-karma');

	grunt.registerTask('test', 'mochaTest');
	grunt.registerTask('karmatest', 'karma');
	grunt.registerTask('htmltest', ['browserify:test1', 'watch']);
	grunt.registerTask('tests', ['mochaTest', 'browserify', 'karmatest']);
	grunt.registerTask('default', ['test', 'browserify', 'uglify', 'watch']);
	grunt.registerTask('skiptest', ['browserify', 'watch']);
};
