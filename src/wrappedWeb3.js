// Here be dragons.

const EthFP = require("ethfp");
const Web3 = require("web3");
const fs = require("fs");
const net = require("net");

module.exports = (httpPath, ipcPath, getAccounts, signTransaction) => {
  // currently used Web3
  var web3, remoteWeb3, localWeb3;

  web3 = null;
  remoteWeb3 = new Web3(new Web3.providers.HttpProvider(httpPath));
  remoteWeb3.local = false;
  remoteWeb3.syncing = null;
  localWeb3 = null;

  // Uses the Web3 connected to remote node
  const useRemoteNode = () => {
    //console.log("|WEB3| Using remote.");
    web3 = remoteWeb3;
  }

  // Uses the Web3 connected to the local IPC
  const useLocalNode = () => {
    //console.log("|WEB3| Using local.");
    web3 = localWeb3;
  }

  // Waits for the local Ethereum node to sync
  const waitLocalNodeSync = () => new Promise((resolve,reject) => {
    //console.log("|WEB3| Waiting local node sync.");
    // This is crazy because eth.getSyncing is crazy. If the Node isn't in
    // sync, it returns an object with a .highestBlock and a .currentBlock. If
    // the Node hasn't started syncing, it returns false. If it is in sync, it,
    // curiously, returns false too. So, there is no way to be sure if it is in
    // sync. My workaround is to assume the node is synched when
    // eth.getSynching returns false, but only after some time has passed since
    // it has opened. That is to ensure it had time to start syncing, otherwise
    // I'd assume it is synced when it hasn't even started syncing.
    const assumeSyncing = setTimeout(() => localWeb3.syncing = [0,0], 20000); // uglily assume synced
    (function waitSync() {
      //localWeb3.eth.getBlockNumber((err,res)=>console.log(res)); // triggers syncing
      localWeb3.eth.getSyncing((err, res) => {
        //console.log("|SYNC| " + JSON.stringify(localWeb3.syncing) + " | " + JSON.stringify(res ? [res.currentBlock,res.highestBlock] : "NotSyncing"));
        if (!err && (!res && localWeb3.syncing || res && res.currentBlock > res.highestBlock - 1000)) {
          resolve();
          clearTimeout(assumeSyncing);
        } else if (!err && res) {
          remoteWeb3.syncing = localWeb3.syncing = [res.currentBlock,res.highestBlock];
          setTimeout(waitSync, 500);
        } else {
          setTimeout(waitSync, 500);
        }
      });
    })();
  });

  // Waits for the Ethereum node to be availble at ipcPath
  const waitLocalNodeOpen = () => new Promise((resolve, reject) => {
    //console.log("|WEB3| Waiting local node open.");
    (function waitOpen() {
      fs.exists(ipcPath, exists => {
        //console.log("|WEB3| " + ipcPath + " " + exists);
        if (exists) {
          localWeb3 = new Web3(new Web3.providers.IpcProvider(ipcPath, net));
          localWeb3.local = true;
          localWeb3.syncing = null;
          resolve();
        } else {
          setTimeout(waitOpen, 1000);
        }
      });
    })();
  });

  // Proxies over Web3 to intercept calls such as `sendTransaction`, `getAccounts`, etc.
  const web3Proxy = new Proxy({}, {
    get: function(target, name) {
      //console.log("|WEB3| Called " + (typeof name === "string" ? name : "") + ". Local: " + web3.local);
      if (name === "eth") {
        return new Proxy(web3.eth, {
          get: function(target, name) {
            if (typeof name === "string") {
              switch (name) {
                case "getAccounts": return function(callback) {
                  getAccounts().then(accounts => callback(null, accounts));
                }
                case "sendTransaction": return function(duckyTx, callback) {
                  // This part is very tricky security-wise. Due to the erratic
                  // way transactions are accepted my Web3, I do not know all
                  // possible formats that this could receive. This could be
                  // exploited in many ways. For example, a DApp might find an
                  // input that displays certain transaction on the
                  // confirmation window, yet signs a different one. The best
                  // long-term solution is to have just a simple Eth-RPC object
                  // to be injected on the browser, which will take care of the
                  // ducky-typing stuff on a higher level, giving us (the
                  // interceptors) just the hex data as described on the
                  // RPC-JSON spec. For the short-term, though, we need
                  // backwards Web3 compat, so this should be reviewed before
                  // this is used by someone.
                  getAccounts().then(accounts => {
                    web3.eth.getTransactionCount(accounts[0].address, function(err, count) {
                      const tx = {
                        "nonce": duckyTx.nonce || EthFP.Nat.fromString(String(count + 1)),
                        "to": duckyTx.to,
                        "data": duckyTx.data,
                        "value": EthFP.Nat.fromString(String(duckyTx.value||0)),
                        "gasPrice": EthFP.Nat.fromString(String(duckyTx.gasPrice)),
                        "gasLimit": EthFP.Nat.fromString(String(duckyTx.gas || tx.gasLimit)),
                        "chainId": EthFP.Nat.fromString("3") // TODO: support mainnet
                      }
                      return signTransaction(tx).then(rawTx => {
                        if (rawTx) {
                          web3.eth.sendRawTransaction(rawTx, callback);
                        } else {
                          callback("Not authorized");
                        }
                      });
                    });
                  });
                }
              }
            }
            return web3.eth[name];
          }
        });
      }
      return web3[name];
    }
  });

  // Creates remote Web3, waits local node sync, then replaces it
  useRemoteNode();
  waitLocalNodeOpen()
    .then(waitLocalNodeSync)
    .then(useLocalNode);

  return web3Proxy;
};
