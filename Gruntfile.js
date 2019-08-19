module.exports = function(grunt) {
    const isparta = require('isparta');

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
                    'dist/milo.bundle.js': 'lib/milo.js'
                },
                options: {
                    transform: ['eslintify', 'brfs'],
                    debug: true
                }
            },
            cover: {
                files: {
                    'dist/milo.cover.bundle.js': 'build/instrument/lib/milo.js'
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
                    transform: ['eslintify', 'brfs']
                }
            }
        },
        copy: {
            mocks: {
                src: 'mocks/**/*.js',
                dest: 'dist/'
            },
            package: {
                src: 'package.json',
                dest: 'build/instrument/'
            }
        },
        instrument: {
            files: 'lib/**/*.js',
            options: {
                cwd: __dirname,
                instrumenter: isparta.Instrumenter
            }
        },
        uglify: {
            options: {
                sourceMap: sourceMap,
                sourceMappingURL: sourceMappingURL,
                sourceMapRoot: '/',
                mangle: false
            },
            milo: {
                files: {
                    'dist/milo.min.js': 'dist/milo.bundle.js'
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
                    'node_modules/milo-core/lib/**/*.js'
                ],
                tasks: ['browserify']
            },
            mocks: {
                files: 'mocks/**/*.js',
                tasks: 'copy'
            },
            test1: {
                files: ['test_html/bind_test/*.js'],
                tasks: 'browserify:test1'
            },
            tests: {
                files: ['test_browser/**/*.{js,html}', 'mocks/**/*'],
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
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-istanbul');

    grunt.registerTask('test', 'mochaTest');
    grunt.registerTask('karma', 'browserify:tests');
    grunt.registerTask('karmatest', 'karma');
    grunt.registerTask('htmltest', ['browserify:test1', 'watch']);
    grunt.registerTask('tests', ['mochaTest', 'copy', 'browserify', 'karmatest']);
    grunt.registerTask('build', ['instrument', 'copy', 'browserify', 'uglify']);
    grunt.registerTask('default', ['test', 'build', 'watch']);
    grunt.registerTask('skiptest', ['browserify', 'watch']);

};
