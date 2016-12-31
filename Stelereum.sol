pragma solidity ^0.4.7;

contract Stelereum {
    event Payment(string accountId, uint256 amount);
    function Stelerum() {
    }
    
    function Pay(string accountId) payable {
        Payment(accountId, msg.value);
    }
}
