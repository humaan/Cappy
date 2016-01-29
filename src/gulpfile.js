var gulp = require('gulp'),
    notify = require('gulp-notify'),
    sass = require('gulp-sass');

// Compile Sass
gulp.task('styles', function () {

    gulp.src('css/style.scss')
        .pipe(sass({
            style: 'expanded',
            sourcemap: false
        })
        .on('error', sass.logError))
        .pipe(gulp.dest('css'))
        .pipe(notify({
            message: 'Generated CSS!'
        }));
});

// Run all major tasks when just `gulp` is run.
gulp.task('default', function () {

    gulp.start('styles');
});
