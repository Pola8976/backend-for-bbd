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

dotenv.config();

router.post('/upload/*', (req, res) => {
  console.log('hi');
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
      fs.writeFile(newPath, rawData, function (err) {
        if (err) console.log(err);
      });
    }
  });
  // return res.send('Successfully uploaded');
});

module.exports = router;
