const EC = require('elliptic').ec;
const fs = require('fs');
const crypto = require('crypto');
const { path } = require('express/lib/application');

const ec = new EC('secp256k1');

class Transaction {
  constructor(dataType, dataPath, address, { pid, fullName, gender, dob }) {
    this.address = address;
    this.timestamp = Date.now();
    this.dataType = dataType;
    this.dataPath = dataPath;
    this.data = fs.readFileSync(dataPath);
    this.patient = {
      pid,
      fullName,
      gender,
      dob,
    };
  }

  calculateHash() {
    return crypto
      .createHash('sha512')
      .update(
        this.address +
          this.timestamp +
          this.dataType +
          this.dataPath +
          this.data +
          JSON.stringify(this.patient)
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
    while (this.hash.substring(0, numZeros) !== Array(numZeros + 1).join('0')) {
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
  constructor({ chain, numZeros, pendingTransactions }, blkExists) {
    this.chain = blkExists ? chain : [this.createGenesisBlock()];
    console.log(this.chain, blkExists);
    this.numZeros = numZeros;
    this.pendingTransactions = pendingTransactions;
  }

  createGenesisBlock() {
    const genBlk = new Block(0, Date.parse('2022-01-01'), []);
    console.log('genesis trigg', genBlk);
    return genBlk;
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
