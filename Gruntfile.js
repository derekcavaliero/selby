'use strict';

module.exports = function( grunt ) {

	grunt.initConfig({

		pkg: grunt.file.readJSON( 'package.json' ),

		project: {
			src  : {
				scss : [ 'src/scss' ],
				js   : [ 'src/js' ],
			},
			dist : {
				css  : [ 'dist/css' ],
				js   : [ 'dist/js' ],
			}
		},

		sass: {
			options: {
				loadPath: [
					'<%= project.bootstrap.scss %>',
					require( 'node-bourbon' ).includePaths,
			 	]
			},
			dist: {
				options: {
					style: 'expanded',  // nested, compact, compressed, expanded
					sourcemap: 'none'     // auto, file, inline, none
				},
				files: {}
			}
		},

		uglify: {
			options: {
				beautify: true,  // minify file when set to false
				compress: false,     // renames variables and all that
				mangle: false
			},
			dist: {
				files: {
					'<%= project.dist.js %>/jquery.selby.min.js': [
						'<%= project.bootstrap.js %>/jquery.selby.js'
					]
				}
			}
		},

		watch: {
			grunt: {
				files	   : [ 'Gruntfile.js' ],
				tasks	   : [ 'build' ]
			},
			options: {
				livereload : true
			},
			sass: {
				files      : [ '<%= project.src.scss %>/**/*.scss' ],
				tasks      : [ 'sass' ],
				exclude    : [ '!**/node_modules/**', '!**/bower_components/**' ]
			},
			scripts: {
				files      : [ '<%= project.src.js %>/**/*.js' ],
				tasks  	   : [ 'uglify' ],
				exclude    : [ '!**/node_modules/**', '!**/bower_components/**' ]
			},
			theme: {
				files	   : ['**/*.html'],
				exclude	   : ['!**/node_modules/**', '!**/bower_components/**' ]
			}
		},

	});

	grunt.loadNpmTasks( 'grunt-contrib-sass' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );

	grunt.registerTask( 'build', [ 'sass', 'uglify' ] );
	grunt.registerTask( 'default', [ 'build', 'watch' ] );

}
