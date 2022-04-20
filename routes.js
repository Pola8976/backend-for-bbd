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
const { Transaction, Block, Blockchain } = require('./blockchain');
const { spawn } = require('child_process');

const ec = new EC('secp256k1');
let blockchainInstance = new Blockchain(
  {
    chain: [],
    pendingTransactions: [],
    numZeros: 2,
  },
  false
);
console.log(blockchainInstance);
const textFilepath = path.join('blockchain.txt');

//Retrieve Blockchain from Text File

try {
  if (fs.existsSync(textFilepath)) {
    console.log('Yes blockchain.txt exists');
    const data = fs.readFileSync('blockchain.txt', {
      encoding: 'utf8',
      flag: 'r',
    });
    blockchainInstance = new Blockchain(JSON.parse(data), true);
  } else {
    console.log('No blockchain.txt does not exist');
    console.log(blockchainInstance);
    fs.writeFileSync(
      path.join(__dirname, 'blockchain.txt'),
      JSON.stringify(blockchainInstance),
      err => {
        if (err) throw err;
      }
    );
  }
} catch (err) {
  console.error(err);
}

// const data = fs.readFileSync('./input.txt',
//             {encoding:'utf8', flag:'r'});

let keyName;
dotenv.config();

const genRandomNumber = () =>
  `${Math.floor(
    Math.random() *
      (parseInt(process.env.TEMP_DIR_MAX) -
        parseInt(process.env.TEMP_DIR_MIN)) +
      parseInt(process.env.TEMP_DIR_MIN)
  )}`;

router.post('/upload', (req, res) => {
  const tempDirName = genRandomNumber();
  const tempDirPath = path.join(__dirname, 'uploads', tempDirName);
  const types = ['key', 'csv', 'images'];

  for (const type of types) {
    fs.mkdirSync(path.join(tempDirPath, type), { recursive: true }, err => {
      if (err) throw err;
    });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    for (const [fileId, file] of Object.entries(files)) {
      console.log(fileId);
      const fileType = fileId.split('-')[1];
      let oldPath = file.filepath;
      let newPath = path.join(tempDirPath, fileType, file.originalFilename);
      if (fileType == 'key') {
        keyName = file.originalFilename;
        console.log(keyName);
      }
      let rawData = fs.readFileSync(oldPath);
      fs.writeFileSync(newPath, rawData, function (err) {
        if (err) console.log(err);
      });
    }

    for (const field of Object.values(fields)) {
      patientObj = JSON.parse(field);
      console.log(patientObj);
    }

    const key = ec.keyFromPrivate(
      fs.readFileSync(path.join(tempDirPath, 'key', keyName))
    );
    const filesInFolders = [];
    const folderNames = ['csv', 'images'];
    for (const folderName of folderNames) {
      filesInFolders.push(fs.readdirSync(path.join(tempDirPath, folderName)));
    }

    for (let i = 0; i < filesInFolders.length; i++) {
      for (const fileName of filesInFolders[i]) {
        const tx = new Transaction(
          folderNames[i],
          path.join(tempDirPath, folderNames[i], fileName),
          key.getPublic('hex'),
          patientObj
        );

        console.log('signing tx');
        tx.signTransaction(key);

        console.log('adding tx');
        blockchainInstance.addTx(tx);
      }
    }

    blockchainInstance.minePendingTransactions();
    fs.writeFileSync(
      path.join(__dirname, 'blockchain.txt'),
      JSON.stringify(blockchainInstance),
      err => {
        if (err) throw err;
      }
    );
  });

  return res.send('Operation successful');
});

router.post('/chain', (req, res) => {
  res.send(blockchainInstance.chain);
});

router.get('/dummy-keys', (req, res) => {
  const key = ec.genKeyPair();
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

router.post('/run-model', (req, res) => {
  const python = spawn('python', ['python/model.py']);
  python.stdout.on('data', function (data) {
    console.log('Pipe data from python script ...');
    dataToSend = data.toString();
    console.log(dataToSend);
  });
  python.on('close', code => {
    console.log(`child process close all stdio with code ${code}`);
  });
});

module.exports = router;
