'use strict';

var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var auth = require('http-auth');
var fs = require('fs-extra');
var rimraf = require('rimraf');
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
var DB_PWD = process.env.DB_PWD || 'bar';
var DB_HOST = process.env.DB_HOST || 'localhost';
var Sequelize = require('sequelize');
var sequelize = new Sequelize(DB_SERVER, DB_USER, DB_PWD, {
  host: DB_HOST,
  dialect: 'mssql',
  logging: null,
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
    id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    hostname: { type: Sequelize.STRING },
    equipment: { type: Sequelize.STRING },
    tag: { type: Sequelize.STRING },
    value: { type: Sequelize.STRING }
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

var app = express();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

app.use(auth.connect(basic));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: true
}));
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
        var newName = uploadFile.name.substring(0, uploadFile.name.length - 3);
        gulp.src('/tmp/' + uploadFile.name)
        .pipe(gunzip())
        .pipe(gulp.dest('/tmp/' + newName))
        .pipe(gcallback(function() {
          rimraf.sync('/tmp/' + uploadFile.name);
          callback(null, '/tmp/' + newName);
        }));
      }
      else if (/.json$/.test(uploadFile.name)) {
        callback(null, '/tmp/' + uploadFile.name);
      }
      else {
        rimraf.sync('/tmp/' + uploadFile.name);
        callback(null, undefined);
      }
    });
  }
  function readFile(path, callback) {
    if (path) {
      fs.readJson(path, function (err, data) {
        if (err) {
          return callback(err);
        }
        rimraf.sync(path);
        callback(null, data);
      });
    }
    else {
      callback(null, undefined);
    }
  }
  function saveToDb(data, callback) {
    if (data) {
      var insertArr = data.map(function (row) {
        var arr = row.tagList.map(function (tagRow) {
          return {
            hostname: hostname,
            equipment: row.equ,
            tag: tagRow.tag,
            value: tagRow.value
          };
        });

        return [].concat.apply([], arr);
      });

      insertArr = [].concat.apply([], data);
      var insert = function (rows) {
        Logs.bulkCreate(rows.splice(0, 20))
          .then(function() {
            console.log('Create log successfully.');
          })
          .catch(function(err) {
            console.log('error');
          });

          // insert more data
          if (insertArr.length > 0) {
            insert(rows);
          }
      }
      insert(insertArr);
      callback(null);
    }
    else {
      callback(null);
    }
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
