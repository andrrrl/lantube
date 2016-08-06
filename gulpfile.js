var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  plumber = require('gulp-plumber'),
  livereload = require('gulp-livereload'),
  uglify = require('gulp-uglify'),
  sass = require('gulp-ruby-sass'),
  pump = require('pump');

gulp.task('sass', function() {
  return sass('./assets/sass/*.scss')
    .pipe(gulp.dest('./public/css'))
    .pipe(livereload());
});

gulp.task('compress', function(cb) {
	pump([
		gulp.src('./assets/js/*.js'),
		uglify(),
		gulp.dest('./public/js')
	],
	cb
	);
});

gulp.task('watch', function() {
  gulp.watch('./assets/**/*.scss', ['sass']);
  gulp.watch('./assets/**/*.js', ['compress']);
});

gulp.task('develop', function() {
  livereload.listen();
  nodemon({
    script: 'bin/www',
    ext: 'js ejs coffee',
    stdout: false
  }).on('readable', function() {
    this.stdout.on('data', function(chunk) {
      if (/^Express server listening on port/.test(chunk)) {
        livereload.changed(__dirname);
      }
    });
    this.stdout.pipe(process.stdout);
    this.stderr.pipe(process.stderr);
  });
});

gulp.task('default', [
	'compress',
	'sass',
	'develop',
	'watch'
]);