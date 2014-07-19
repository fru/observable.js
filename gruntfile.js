module.exports = function(grunt) {

  grunt.initConfig({
    qunit: {
      options: {
        '--web-security': 'no',
        coverage: {
          src: ['src/**/*.js'],
          instrumentedFiles: 'temp/',
          lcovReport: 'report',
        }
      },
      all: ['test/*.html']
    },
    coveralls: {
      all: {
        src: 'report/*.info'
      },
    },
    closureCompiler: {
      options: {
        compilerFile: require('closure-compiler').JAR_PATH,
        compilation_level: 'SIMPLE_OPTIMIZATIONS'
      },
      all: {
        src: 'src/observable.js',
        dest: 'observable.min.js'
      }
    },
    docco: {
      all: {
        src: ['src/**/*.js'],
        options: {
          output: 'report/src-docco/'
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-qunit-examples');
  grunt.loadNpmTasks('grunt-coveralls');
  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.loadNpmTasks('grunt-docco');

  grunt.registerTask('default', ['closureCompiler', 'docco']);
  grunt.registerTask('all', ['qunit', 'closureCompiler', 'docco', 'coveralls']);
  grunt.registerTask('test', ['qunit']);
};
