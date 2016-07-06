'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auth = require('http-auth');
var fs = require('fs-extra');
var gulp = require('gulp');
var gunzip = require('gulp-gunzip');
var gcallback = require('gulp-callback');
var basic = auth.basic({
	realm: "Simon Area.",
  file: __dirname + "/.htpasswd"
});
var fileUpload = require('express-fileupload');
var async = require('async');
var DB_SERVER = process.env.DB_SERVER || 'sqlserver';
var DB_USER = process.env.DB_USER || 'foo';
var DB_PWD = process.env.DB_USER || 'bar';
var DB_HOST = process.env.DB_HOST || 'localhost';
var Sequelize = require('sequelize');
var sequelize = new Sequelize(DB_SERVER, DB_USER, DB_PWD, {
  host: DB_HOST,
  dialect: 'mssql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  dialectOptions: {
    encrypt: true
  }
});
var Logs = sequelize.define('logs', {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  hostname: { type: Sequelize.STRING },
  log: {
    type: Sequelize.TEXT,
    get: function() {
      return JSON.parse(this.getDataValue('log'));
    },
    set: function(v) {
      var tmp = null;
      try {
        tmp = JSON.stringify(v);
      } catch(error) {
        throw new Error('Token model json stringify error.');
      }
      return this.setDataValue('log', tmp);
    }
  }
});
sequelize
  .authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
    return Logs.sync({force: true});
  })
  .catch(function (err) {
    console.log('Unable to connect to the database:', err);
  });

// var routes = require('./routes/index');

var app = express();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

// view engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use(auth.connect(basic));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.post('/file/:host', function(req, res) {
	var uploadFile;
  var hostname = req.params.host;

	if (!req.files) {
		res.send('No files were uploaded.');
		return;
	}

	uploadFile = req.files.file;

  async.waterfall([
    fileProcess,
    readFile,
    saveToDb
  ], function(err) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.send('File uploaded!');
    }
  });

  function fileProcess(callback) {
    uploadFile.mv('/tmp/' + uploadFile.name, function(err) {
      if (err) {
        return callback(err);
      }
      if (/.json.gz$/.test(uploadFile.name)) {
        gulp.src('/tmp/' + uploadFile.name)
        .pipe(gunzip())
        .pipe(gulp.dest('/tmp/' + uploadFile.name.substring(0, uploadFile.name.length - 3)))
        .pipe(gcallback(function() {
          callback(null, '/tmp/' + uploadFile.name.substring(0, uploadFile.name.length - 3));
        }));
      }

      if (/.json$/.test(uploadFile.name)) {
        callback(null, '/tmp/' + uploadFile.name);
      }
    });
  }
  function readFile(path, callback) {
    fs.readJson(path, function (err, data) {
      if (err) {
        return callback(err);
      }
      callback(null, data);
    });
  }
  function saveToDb(data, callback) {
    Logs.create({
      log: data,
      hostname: hostname
    })
    .then(function() {
      console.log('Create log successfully.');
      callback(null);
    })
    .catch(function(err) {
      callback(err);
    });
  }
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'error'
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
});


module.exports = app;
