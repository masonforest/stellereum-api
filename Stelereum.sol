pragma solidity ^0.4.7;

contract Owned{
    address owner;

    function owned() {
        owner = msg.sender;
    }

    function isOwner() constant returns (bool) {
        return msg.sender == owner;
    }
}

contract Stelereum is Owned {
    event DepositEvent(string accountId, uint256 amount);

    function Deposit(string accountId) payable {
        DepositEvent(accountId, msg.value);
    }

    function Withdrawl(address addr, uint amount) {
        if(isOwner()){
            addr.send(amount);
        }
    }
}
