module.exports = function (grunt) {
	
	// Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  grunt.initConfig({
  	watch: {
  		testing: {
  			files: ['./app.js', './lib/**/*.js', './test/**/*.js'],
  			tasks: ['test:all']
  		}
  	},
  	mochacli: {
  		options: {
	      timeout: '10000',
	      reporter: 'spec',
	    },
	    all:{
	    	src: [
        	'test/helpers/test.helper.spec.js',
        	'test/**/*.spec.js',
      	],
	    }
		}
  });

  grunt.registerTask('test', function (target) {
  	if (!target) target = 'all';

  	grunt.task.run(['mochacli:' + target]);
  });
};