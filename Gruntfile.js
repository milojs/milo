module.exports = function(grunt) {
	var bundles = getBundles();

	grunt.initConfig({
		browserify: {
			build: {
				files: {
					'bndr.js': bundles.bndr
				}
			}
		},
		watch: {
			build: {
				files: bundles.bndr,
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

	grunt.registerTask('default', ['browserify', 'watch']);

	function getBundles() {
        return {
            bndr: [
                'lib/bndr.js',
                'node_modules/proto/proto.js'
            ]
        };
    }
};