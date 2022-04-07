const express = require('express');
const router = express.Router();
// const mysql = require('mysql');
// const bcrypt = require('bcryptjs');
// const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
// const jwt = require('jsonwebtoken');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const { type } = require('express/lib/response');
const EC = require('elliptic').ec;

const ec = new EC('secp256k1');
dotenv.config();

const genRandomNumber = () =>
  `${Math.floor(
    Math.random() *
      (parseInt(process.env.TEMP_DIR_MAX) -
        parseInt(process.env.TEMP_DIR_MIN)) +
      parseInt(process.env.TEMP_DIR_MIN)
  )}`;

router.post('/upload/*', (req, res) => {
  // const tempDirName = genRandomNumber();
  // const tempDirPath = path.join(__dirname, 'uploads', tempDirName);
  // const types = ['key', 'csv', 'images'];

  // for (const type of types) {
  //   fs.mkdirSync(path.join(tempDirPath, type), { recursive: true }, err => {
  //     if (err) throw err;
  //   });
  // }

  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    for (const file of Object.values(files)) {
      let oldPath = file.filepath;
      let newPath = path.join(
        __dirname,
        'uploads',
        req.url.split('/')[2],
        file.originalFilename
      );
      let rawData = fs.readFileSync(oldPath);
      fs.writeFileSync(newPath, rawData, function (err) {
        if (err) console.log(err);
      });
    }
  });
  // return res.send('Successfully uploaded');
});

router.get('/dummy-keys', (req, res) => {
  const key = ec.genKeyPair();
  // res.set('Content-Disposition', 'attachment');
  console.log(key);
  console.log(key.getPublic('hex'));
  console.log(key.getPrivate('hex'));

  const tempDirName = genRandomNumber();

  const tempDirPath = path.join(__dirname, 'temp-key-storage', tempDirName);
  const tempDirPathWrtServer = path.join('temp-key-storage', tempDirName);

  fs.mkdirSync(tempDirPath, err => {
    if (err) throw err;
  });

  fs.writeFileSync(
    path.join(tempDirPath, 'public.txt'),
    key.getPublic('hex'),
    err => {
      if (err) throw err;
    }
  );

  fs.writeFileSync(
    path.join(tempDirPath, 'private.txt'),
    key.getPrivate('hex'),
    err => {
      if (err) throw err;
    }
  );

  fs.writeFileSync(
    path.join(tempDirPath, 'key.json'),
    JSON.stringify(key),
    err => {
      if (err) throw err;
    }
  );

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>
          Keys
        </title>
      </head>

      <body>
        <h1>
          Keys
        </h1>
        <h3><a href = "${path.join(
          tempDirPathWrtServer,
          'public.txt'
        )}" target="_blank" download>
          PUBLIC
        </a></h3>
        <h3><a href = "${path.join(
          tempDirPathWrtServer,
          'private.txt'
        )}" target="_blank" download>
          PRIVATE
        </a></h3>
        <h3><a href = "${path.join(
          tempDirPathWrtServer,
          'key.json'
        )}" target="_blank" download>
          KEY
        </a></h3>
        <h2 style="color: red">
          Never share KEY or PRIVATE key!!
        </h2>
      </body>
    <html>
  `);

  // fs.unlink(tempDirPath, err => {
  //   if (err) throw err;
  // });
});

router.get('/temp-key-storage/*', (req, res) => {
  console.log(path.join(__dirname, req.url.substring(1)));
  res.sendFile(path.join(__dirname, req.url.substring(1)));
});

module.exports = router;
