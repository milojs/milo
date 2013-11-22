module.exports = function(grunt) {
	var bundles = getBundles();

	grunt.initConfig({
		mochaTest: {
			build: {
				options: {
		        	reporter: 'spec'
		        },
		        src: ['test/**/*.js']
			}
		},
		browserify: {
			build: {
				files: {
					'milo.bundle.js': bundles.milo
				}
			}
		},
		watch: {
			build: {
				files: bundles.milo,
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

	grunt.registerTask('test', 'mochaTest');
	grunt.registerTask('default', ['test', 'browserify', 'watch']);

	function getBundles() {
        return {
            milo: [
                'lib/milo.js',
                'node_modules/proto/proto.js'
            ]
        };
    }
};