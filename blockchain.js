const EC = require('elliptic').ec;
const fs = require('fs');
const crypto = require('crypto');
const { path } = require('express/lib/application');

const ec = new EC('secp256k1');

class Transaction {
  constructor(dataType, dataPath, address, { pid, fullName, gender, dob }) {
    this.dataType = dataType;
    this.dataPath = dataPath;
    this.data = fs.readFileSync(dataPath);
    this.address = address;
    this.patient = {
      pid,
      fullName,
      gender,
      dob,
    };

    // moveTransactedData();
  }

  moveTransactedData() {
    let newPath = this.dataPath.split('/');
    newPath.splice(newPath.length - 2, 0, 'transacted');
    newPath.join();
    fs.rename(this.dataPath, path.join());
  }

  calculateHash() {
    return crypto
      .createHash('sha512')
      .update(
        this.address +
          this.timestamp +
          crypto.createHash('sha512').update(this.data)
      )
      .digest('hex');
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.address) {
      throw new Error('You cannot sign transactions for other users!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');

    console.log('tx signed');
  }

  isValid() {
    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    const publicKey = ec.keyFromPublic(this.address, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  constructor(prevHash, timestamp, transactions) {
    this.prevHash = prevHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha512')
      .update(
        this.prevHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest('hex');
  }

  mineBlock(numZeros) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Blockchain {
  // constructor() {
  //   this.chain = [this.createGenesisBlock()];
  //   this.numZeros = 2;
  //   this.pendingTransactions = [];
  // }

  constructor({ chain, numZeros, pendingTransactions }) {
    this.chain = chain;
    this.numZeros = numZeros;
    this.pendingTransactions = pendingTransactions;
  }

  createGenesisBlock() {
    return new Block(Date.parse('2022-01-01'), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions() {
    const block = new Block(
      this.getLatestBlock().hash,
      Date.now(),
      this.pendingTransactions
    );
    block.mineBlock(this.numZeros);

    console.log('Block successfully mined!');
    this.chain.push(block);

    this.pendingTransactions = [];
  }

  addTx(transaction) {
    if (!transaction.address) {
      throw new Error('Transaction must include address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    const pendingTxForWallet = this.pendingTransactions.filter(
      tx => tx.address === transaction.address
    );

    this.pendingTransactions.push(transaction);
    console.log('transaction added: %s', transaction);
  }

  getAllTransactionsForWallet(address) {
    const txs = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.address === address) {
          txs.push(tx);
        }
      }
    }

    console.log(`get transactions for wallet count: ${txs.length}`);
    return txs;
  }

  isChainValid() {
    const realGenesis = JSON.stringify(this.createGenesisBlock());

    if (realGenesis !== JSON.stringify(this.chain[0])) {
      return false;
    }

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (previousBlock.hash !== currentBlock.previousHash) {
        return false;
      }

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
    }

    return true;
  }
}

module.exports.Blockchain = Blockchain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
