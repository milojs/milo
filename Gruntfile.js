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
					log: true
				}
			}
		},
		browserify: {
			build: {
				files: {
					'milo.bundle.js': 'lib/milo.js'
				}
			}
		},
		watch: {
			build: {
				files: ['lib/**/*.js', 'node_modules/proto/lib/proto.js'],
				tasks: 'browserify'
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
	grunt.registerTask('htmltest', 'mocha');
	grunt.registerTask('default', ['test', 'browserify', 'watch']);

	function getBundles() {
        return {
        };
    }
};