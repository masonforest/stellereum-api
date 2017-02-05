var request = require('request');
var Web3 = require('web3');
var BigNumber = require('bignumber.js');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_RPC_URL));
var _ = require('lodash');
var bodyParser = require('body-parser');
var express = require('express');
var cors = require('cors');
var app = express();
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())

const SOURCE_KEY = process.env.SOURCE_KEY;
const ETHEREUM_SECRET_KEY = process.env.ETHEREUM_SECRET_KEY;
const ETHEREUM_OWNER_ADDRESS = process.env.ETHEREUM_OWNER_ADDRESS;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_API =
[{"constant":false,"inputs":[{"name":"addr","type":"address"},{"name":"amount","type":"uint256"}],"name":"Withdrawl","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"accountId","type":"string"}],"name":"Deposit","outputs":[],"payable":true,"type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"accountId","type":"string"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"DepositEvent","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"addr","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"WithdrawlEvent","type":"event"}]
var StelereumContract = web3.eth.contract(CONTRACT_API);


var stelereum = StelereumContract.at(CONTRACT_ADDRESS);
stelereum.DepositEvent().watch(function(error, {
  transactionHash,
  args: {
    accountId,
    amount,
  }
}
) {
  if (error) {
      console.log(error);
  } else {
      console.log(transactionHash)
      pay({
        transactionHash,
        accountId,
        amount: amount.dividedBy(new BigNumber('1e18')).toString(10),
      });
  }
});

function pay({transactionHash, accountId, amount}){
  request.post({
    url: `${process.env.STELLAR_BRIDGE_SERVER}/payment`,
    form: {
      amount,
      destination: accountId,
      asset_code: 'ETH',
      asset_issuer: process.env.ASSET_ISSUER,
      source: SOURCE_KEY,
    }
  }, function(error, response, body) {
    console.log(JSON.stringify(arguments))
    if (error || response.statusCode !== 200) {
      console.error(error);
    }
    else {
      console.log(body);
    }
  });
}

app.get('/federation', function (req, res) {
  const [ address, domain ] = req.query.q.split('*')
  res.json({
    stellar_address:  req.query.q,
    account_id: process.env.RECEIVING_ACCOUNT_ID,
    memo_type: "hash",
    memo: address.substring('2') + _.repeat("0", 24),
  });
})

app.post('/receive', function (req, res) {
    console.log(req.body)
  if(req.body.memo){
  const { amount } = req.body;
  const address = '0x' + new Buffer(req.body.memo, 'base64').toString('hex').substr(0,40)
  callEtherumFunction({
    functionName: 'Withdrawl',
    privateKey: ETHEREUM_SECRET_KEY,
    abi: CONTRACT_API,
    fromAddress: ETHEREUM_OWNER_ADDRESS,
    toAddress: address,
    amount,
  }, (error, hash) => {
    console.log(error)
    console.log(hash)
    res.end(hash)
  })
  }else{
    res.end("")
  }
})

var Web3 = require('web3');
var Tx = require('ethereumjs-tx');
var _ = require('lodash');
var SolidityFunction = require('web3/lib/web3/function');


function callEtherumFunction({
  functionName,
  abi,
  amount,
  privateKey,
  value,
  fromAddress,
  toAddress,
}, callback) {
  var solidityFunction = new SolidityFunction('', _.find(abi, {name: functionName}), '');
  var payloadData = solidityFunction.toPayload([
   toAddress,
   new BigNumber(amount).times(new BigNumber('1e18')).toString(10),
  ]).data;
  gasPrice = web3.eth.gasPrice;
  gasPriceHex = web3.toHex(gasPrice.times(3));
  gasLimitHex = web3.toHex(300000);
  nonce = web3.eth.getTransactionCount(fromAddress);
  nonceHex = web3.toHex(nonce);
  var rawTx = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: CONTRACT_ADDRESS,
      from: fromAddress,
      data: payloadData,
      value: '0x0',
  };
  console.log(rawTx)
  var tx = new Tx(rawTx);
  tx.sign(new Buffer(privateKey, 'hex'));
  var serializedTx = tx.serialize();
  web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), callback);
}

app.listen(process.env.PORT, function () {
    console.log(`Example app listening on port ${process.env.PORT}!`)
})
