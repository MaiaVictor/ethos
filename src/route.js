const path = require("path");
const os = require("os");

module.exports = test => {
  const make = route => path.join.apply(this, [os.homedir() + "/.mist_lite"].concat(route));
  const ethBin = make(["bin", "geth"]);
  const ethIpc = test ? make(["Ethereum", "testnet", "geth.ipc"]) : make(["Ethereum", "geth.ipc"]);
  const ethData = test ? make(["Ethereum", "testnet"]) : make(["Ethereum"]);
  const ethHttp = "https://" + (test ? "ropsten" : "mainnet") + ".infura.io/sE0I5J1gO2jugs9LndHR";
  return {make, ethBin, ethIpc, ethData, ethHttp};
}
