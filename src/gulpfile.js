'use strict';

var del = require('promised-del');
var gulp = require('gulp');
var notify = require('gulp-notify');
var replace = require('gulp-replace');
var sass = require('gulp-sass');
var zip = require('gulp-zip');

// Compile Sass
gulp.task('styles', function () {

    return gulp.src('css/style.scss')
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

// Remove previous build
gulp.task('dist:clean', function (callback) {

    return del('extension/**');
});

// Copy required files to output dir
gulp.task('dist:copy', ['dist:clean', 'styles'], function () {

    var filesToCopy = [
        'css/**/*.css',
        'images/**',
        'js/**',
        'node_modules/jquery/dist/jquery.min.*',
        'node_modules/jquery-tags-input/dist/*',
        'manifest.json',
        '*.html'
    ];
    return gulp.src(filesToCopy, {base: './'})
        .pipe(gulp.dest('extension'));
});

// String replacement
gulp.task('dist:replace', ['dist:copy'], function (callback) {

    // Replace dev values with release values
    return gulp.src('extension/manifest.json')
        .pipe(replace('Cappy.Dev', 'Cappy'))
        .pipe(replace('icon.dev.png', 'icon.png'))
        .pipe(gulp.dest('extension'));
});

// Zip up the extension
gulp.task('dist:zip', ['dist:replace'], function (callback) {

    return gulp.src('extension/**')
        .pipe(zip('extension.zip'))
        .pipe(gulp.dest(''));
});

// Build a release
gulp.task('dist', ['dist:zip'], function () {

    // the zip dependency kicks off a synchronous build-chain
});

// Run all major tasks when just `gulp` is run.
gulp.task('default', function () {

    gulp.start('styles');
});

// Watch these files and run tasks when they're modified.
gulp.task('watch', function() {

    gulp.watch('css/**/*.scss', ['styles']);
});
