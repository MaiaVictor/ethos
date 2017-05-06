const {ipcRenderer} = require(""+"electron");
const route = require("./route.js")(true);

const inject = (name, term) => {
  // TODO: better way?
  for (var i = 0; i < 20; ++i)
    setTimeout(() => (global[name] = window[name] = term), 200 * i);
};

// setImmediate shim. See https://github.com/electron/electron/issues/2984
inject("setImmediate", setImmediate);

// IPC
let onAnswer = {};
let nextId = 0;
ipcRenderer.on("answer", (e,data) => onAnswer[data[0]] && onAnswer[data[0]](data[1]));
window.ask = (question, args) => new Promise((resolve,reject) => {
  ipcRenderer.sendToHost.apply(null, [question, ++nextId].concat(args));
  onAnswer[nextId] = resolve;
});

 // Inject web3
const getAccounts = () => ask("getAccounts", []);
const signTransaction = tx => ask("signTransaction", [tx]);;
inject("web3", require("./wrappedWeb3")(route.ethHttp, route.ethIpc, getAccounts, signTransaction));
