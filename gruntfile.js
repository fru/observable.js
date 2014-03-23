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
    }
  });
  
  grunt.loadNpmTasks('grunt-qunit-istanbul');
  grunt.loadNpmTasks('grunt-coveralls');

  grunt.registerTask('build', ['qunit','coveralls']); //'coveralls'
};
