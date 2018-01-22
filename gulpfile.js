var gulp = require('gulp');
var del = require('del');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var runSequence = require('run-sequence');
var babel = require('gulp-babel');

// CSS processing
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer')
// var cssnano = require('gulp-cssnano');


// gulp.task('watch', function(){
//   gulp.watch('src/*.js', ['build:js']);
//   gulp.watch('src/css/*.css', ['build:css'])
//   gulp.watch('src/*.html', ['build:html'])
//   gulp.watch('src/assets/', ['xfer:assets'])
//   gulp.watch('src/data/', ['xfer:data'])
// });

var cssPlugins = [
        autoprefixer({browsers: ['last 2 versions']}),
    ];


gulp.task('useref', function(){
  return gulp.src('src/index.html')
    .pipe(useref())
    // .pipe(gulpIf('*.js', babel({presets: ['env']})))
    .pipe(gulpIf('*.css', postcss(cssPlugins)))
    .pipe(gulp.dest('build'));
});


gulp.task('xfer:assets', function(){
  return gulp.src('src/assets/**/*')
    .pipe(gulp.dest('build/assets'))
})

gulp.task('xfer:data', function(){
  return gulp.src('src/data/**/*')
    .pipe(gulp.dest('build/data'))
})

gulp.task('clean:build', function(){
  return del.sync(['build/**/*'])
})


// Build sequences

gulp.task('build', function(callback){
  runSequence(
    'clean:build',
    ['useref', 'xfer:data', 'xfer:assets'],
    callback
  )
})