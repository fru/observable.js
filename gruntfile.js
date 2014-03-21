module.exports = function(grunt) {

  grunt.initConfig({
    'qunit-cov':{
      test:{
        minimum: 0.99,
        srcDir: 'src',
        depDirs: ['test'],
        outDir: 'output',
        testFiles: ['test/*.html']
      }
    },
    coveralls: {
      all: {
        src: 'report/*.info'
      },
    },
  });
  
  grunt.loadNpmTasks('grunt-qunit-cov');
  grunt.loadNpmTasks('grunt-coveralls');

  grunt.registerTask('build', ['qunit-cov']); //'coveralls'
};