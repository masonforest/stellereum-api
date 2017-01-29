var request = require('request');
var Web3 = require('web3');
var BigNumber = require('bignumber.js');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETHEREUM_RPC_URL));
var express = require('express');
var app = express();

const SOURCE_KEY = process.env.SOURCE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_API =
[{"constant":false,"inputs":[{"name":"accountId","type":"string"}],"name":"Pay","outputs":[],"payable":true,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"accountId","type":"string"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Payment","type":"event"}];
var StelereumContract = web3.eth.contract(CONTRACT_API);

var stelereum = StelereumContract.at(CONTRACT_ADDRESS);
stelereum.Payment().watch(function(error, {
  transactionHash,
  args: {
    accountId,
    amount,
  }
}) {
  if (error) {
      console.log(error);
  } else {
      pay({
        transactionHash,
        accountId,
        amount: amount.dividedBy(new BigNumber('1e18')).toString(10),
      });
  }
});

function pay({transactionHash, accountId, amount}){
  console.log(amount)
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
  res.send(JSON.stringify({
    stellar_address:  req.query.q,
    account_id: process.env.ASSET_ISSUER,
    memo_type: "text",
    memo: address
  }));
})

app.listen(process.env.PORT, function () {
    console.log(`Example app listening on port ${process.env.PORT}!`)
})
