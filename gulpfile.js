
let gulp = require('gulp');
let $ = require('gulp-load-plugins')();
let autoprefixer = require('autoprefixer');
let mainBowerFiles = require('main-bower-files');
let browserSync = require('browser-sync').create();
let minimist = require('minimist');
var gulpSequence = require('gulp-sequence');


//預設值設定
let envOptions = {
  string: 'env',
  default: {
    env: 'develop'
  }
}

let options = minimist(process.argv.slice(2), envOptions)
 

gulp.task('taskName', function(){
  gulp.src('./source/**/*.html') //處理前資料來源
    .pipe(gulp.dest('./public')) //處理後資料輸出
})

//clean
gulp.task('clean', function () {
  return gulp.src(['./.tmp','./public'], {read: false})
      .pipe($.clean());
});

//pugCompiler
gulp.task('pug', function () {
  return gulp.src('./source/*.pug')
  .pipe($.plumber())
  .pipe($.pug({
    pretty: true //option
  }))
  .pipe(gulp.dest('./public')) //處理後資料輸出
  .pipe(browserSync.stream()); //更新後伺服器自動重新整理
});
 
//sassCompiler
gulp.task('sass', function () {
  var plugins = [
    autoprefixer({browsers: ['last 2 version', 'ie 6-8']}) //依據不同瀏覽器條件，加入前綴詞
  ];
  return gulp.src('./source/sass/**/*.sass')
    .pipe($.plumber()) // 即使此任務錯誤，後面任務也會執行
    .pipe($.sourcemaps.init()) //標示 css 壓縮、合併程式碼的原始位置
    .pipe($.sass().on('error', $.sass.logError)) //sass 已編譯完
    .pipe($.postcss(plugins)) //css 後處理器
    .pipe($.if(options.env === 'production', $.cleanCss({compatibility: 'ie8'}))) //env 為 production 才壓縮 css
    .pipe($.sourcemaps.write('.')) 
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream()); //更新後伺服器自動重新整理
});

//babel
gulp.task('babel', function() {
    gulp.src('./source/js/**/*.js')
        .pipe($.sourcemaps.init()) //標示合併後 js 壓縮、合併程式碼的原始位置
        .pipe($.babel({
            presets: ['@babel/env']
        }))
        .pipe($.concat('all.js')) //將 source 的 js 在 public 整合成同一個 js        
        .pipe($.if(options.env === 'production' , $.uglify({ //env 為 production 才壓縮 js
          compress: {
            drop_console: true //去除 console
          } 
        })))
        .pipe($.sourcemaps.write('.')) 
        .pipe(gulp.dest('./public/js')) 
        .pipe(browserSync.stream()); //更新後伺服器自動重新整理
});

//壓縮圖片
gulp.task('imageMin', function(){
  gulp.src('./source/images/*')
  .pipe($.imagemin({
    interlaced: true,
    progressive: true,
    optimizationLevel: 10,
    svgoPlugins: [
      {
        removeViewBox: true
      }
    ]
  }))
  .pipe(gulp.dest('./public/images'))
});


//bower
gulp.task('bower', function() {
  return gulp.src(mainBowerFiles({
    "overrides": {
      "vue": {                       // 套件名稱
          "main": "dist/vue.js"      // 自訂取用的資料夾路徑，路徑為 bower_components
      }
    }
  }))
      .pipe(gulp.dest('./.tmp/vendors')) //建立暫存資料夾存取 bower package
});

//將 vendor 的 js 在 public 整合成同一個 vendor.js
gulp.task('vendorJS', ['bower'], function() { //為避免 bower 還沒跑完，vendorJS 先跑。因此跑 vendorJS 前，要先跑 bower
  return gulp.src('./.tmp/vendors/**/**.js')
    .pipe($.order([
      'vue.js',
      'jquery.js'
    ]))
    .pipe($.concat('vendor.js'))
    .pipe($.if(options.env === 'production', $.uglify())) //js 壓縮
    .pipe(gulp.dest('./public/js'))
});

//server
gulp.task('browser-sync', function() {
  browserSync.init({
      server: {
          baseDir: "./public" //檔案路徑
      },
      reloadDebounce: 2000 //重新整理次數
  }); 
});


//監聽任務
gulp.task('watch', function(){
  gulp.watch('./source/**/*.pug', ['pug']);
  gulp.watch('./source/sass/**/*.sass', ['sass']);
  gulp.watch('./source/js/**/*.js', ['babel']);
})

//監聽是否有任何新增或刪除
$.watch(['./source/sass/**/*.sass'], function() { 
  gulp.start('sass');   // 如果有便呼叫 sass 這個 Task
});

$.watch(['./source/js/**/*.js'], function() {
  gulp.start('babel'); // 如果有便呼叫 babel 這個 Task
});


//同時執行所有任務 
gulp.task('default', ['pug','sass', 'babel', 'vendorJS', 'imageMin', 'browser-sync', 'watch']); //開發時使用

//同時執行所有任務，要記得用 gulp bulid --env production
gulp.task('build', gulpSequence('clean','pug','sass', 'babel', 'vendorJS')) //輸出最終檔案用