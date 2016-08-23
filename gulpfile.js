'use strict';

var gulp = require('gulp'),
  exec = require('child_process').exec,
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

// DEV
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

// PROD
gulp.task('run', function(cb) {
  livereload.listen();
  exec('node bin/www', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
});

// nodemon: YES, livereload: YES
// Notice: nodemon will stop any Lantube playback
gulp.task('default', [
  'compress',
  'sass',
  'develop',
  'watch'
]);

// nodemon: NO, livereload: YES
gulp.task('lantube', [
  'compress',
  'sass',
  'run',
  'watch'
]);

