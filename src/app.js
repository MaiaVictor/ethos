const {remote,ipcRenderer} = require(""+"electron");
const drag = require('electron-drag');
const path = require("path");
const route = require("./route")(true);
const web3 = require("./wrappedWeb3")(route.ethHttp, route.ethIpc);
const EthFP = require("ethfp");

class TopBar extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    setInterval(() => this.forceUpdate(), 100);
  }
  render() {
    const style = {
      width: "100%",
      height: this.props.style.height,
      color: "white",
      backgroundColor: "black",
      WebkitUserSelect: "none",
      WebkitAppRegion: "drag"
    }

    const ethereumLogoStyle = {
      margin: "2px 4px",
      cursor: "pointer",
      display: "inline-block"
    }

    const warningStyle = {
      margin: "2px 4px",
      display: "inline-block",
      position: "relative",
      top: "2px"
    }

    const closeStyle = {
      margin: "10px 8px",
      float: "right",
      cursor: "pointer"
    }

    const syncingText = web3.syncing
      ? " (local sync: " + (web3.syncing[0]/web3.syncing[1]*100).toFixed(0) + "%)"
      : " (opening local node)";

    return <div id="TopBar" style={style}>
      {this.props.logged ? <img src="home.png" height="36px" style={ethereumLogoStyle}  onClick={() => this.props.setUrl("")}/> : null}
      {web3.local ? null : <img src="warning.png" height="36px" style={warningStyle} title={"Using remote node" + syncingText}/>}
      <img src={this.props.logged ? "logout.png" : "close.png"} height="22px" style={closeStyle} onClick={this.props.close}/>
    </div>;
  }
}

class WebView extends React.Component {
  constructor(props) {
    super(props);
    this.webview = document.createElement("webview");
    this.webview.id = "webview";
    this.webview.addEventListener("ipc-message", e => {
      const answer = value => this.webview.send("answer",[e.args[0], value]);
      switch (e.channel) {
        case "getAccounts":
          return answer([EthFP.Account.fromPrivate(this.props.privateKey).address.toLowerCase()]);
        case "signTransaction":
          return answer(EthFP.Account.signTransaction(e.args[1], this.props.privateKey));
      }
    });
    if (props.captureConsole) {
      this.webview.addEventListener("console-message", (e) => {
        console.log("|webview|", e.message)
      });
    };
  }
  componentDidMount() {
    ReactDOM.findDOMNode(this).appendChild(this.webview);
    this.refreshProps();
  }
  componentDidUpdate() {
    this.refreshProps();
  }
  refreshProps() {
    var container = ReactDOM.findDOMNode(this);
    for (let key in this.props) {
      if (key === "style") {
        for (let style in this.props.style) {
          container.style[style] = this.props.style[style];
        }
      } else {
        this.webview[key] = this.props[key];
      }
      this.webview.style.width = "100%";
      this.webview.style.height = "100%";
    }
  }
  render() {
    return <div style={{
      backgroundImage: "url(loading.gif)",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      backgroundPosition: "center",
    }}/>;
  }
}

class Hoverable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hover: false};
  }
  render() {
    const onMouseEnter = () => this.setState({hover: true});
    const onMouseLeave = () => this.setState({hover: false});
    return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {this.props.element(this.state.hover)}
    </div>;
  }
}

class DappIcon extends React.Component {
  onClick() {
    this.props.setUrl("http://wallet.ethereum.org");
    console.log("setting url");
  }
  render() {
    const buttonStyle = {
      width: "128px",
      height: "128px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
    }
    return <div onClick={this.onClick.bind(this)} style={buttonStyle}>
      <Hoverable element={hover =>
        <img src="wallet.png" height="100px" style={{"WebkitFilter": hover ? "drop-shadow(0px 0px 4px rgba(255,255,255,0.8))" : ""}}/>
      }/>
    </div>;
  }
}

class Home extends React.Component {
  render() {
    const homeStyle = {
      display: "flex",
      flexFlow: "row nowrap",
      height: "100%",
      backgroundColor: "black",
      backgroundImage: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(prism.jpg)",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
      backgroundPosition: "center",
    }
    return <div style={homeStyle}>
      <DappIcon setUrl={this.props.setUrl}/>
    </div>
  }
}

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" // TODO: should be empty string
    }
  }
  setPrivateKey(e) {
    this.setState({privateKey: e.target.value});
  }
  render() {
    const bodStyle = {
      display: "flex",
      height: "100%",
      flexFlow: "column nowrap",
      justifyContent: "center",
      color: "white",
      alignItems: "center",
    }
    const titleStyle = {
      margin: "8px",
      marginTop: "-90px"
    }
    const textStyle = {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "rgb(70,70,70)"
    }
    const inputStyle = {
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "rgb(70,70,70)",
      padding: "6px",
      margin: "4px",
      fontSize: "26px",
      width: "520px",
      height: "30px",
      border: "0px solid black",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      borderRadius: "2px"
    }
    const buttonStyle = {
      padding: "4px 8px",
      margin: "8px",
      backgroundColor: "rgba(255,255,255,0.1)",
      fontFamily: "monospace",
      fontSize: "20px",
      color: "rgb(60,60,60)",
      border: "0px solid black",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      borderRadius: "2px",
      cursor: "pointer"
    }
    return <div style={bodStyle}>
      <img style={titleStyle} src="title.png"/>
      <p style={textStyle}>
        Enter Private Key
      </p>
      <input style={inputStyle} type="password" onChange={this.setPrivateKey.bind(this)}/>
      <button style={buttonStyle} onClick={()=>this.props.setPrivateKey(this.state.privateKey)}>
        Access
      </button>
    </div>
  }
}

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      url: "",
      privateKey: null
    }
  }
  setUrl(url) {
    this.setState({url: url});
  }
  setPrivateKey(privateKey) {
    this.setState({privateKey: privateKey});
  }
  close() {
    if (this.state.privateKey) {
      this.setState({privateKey: null});
    } else {
      remote.getCurrentWindow().close();
    }
  }
  render() {
    const topHeight = "42px";
    const bodHeight = "calc(100% - "+topHeight+")";
    return <div style={{width: "100%", height: "100%", border: "0px dashed black"}}>
      <TopBar style={{height: topHeight}} setUrl={this.setUrl.bind(this)} close={this.close.bind(this)} logged={!!this.state.privateKey}/>
      <div style={{width: "100%", height: bodHeight, border: "0px dashed pink"}}>
        <div style={{display: "inline-block", verticalAlign: "top", height: "100%", width: "100%", border: "0px dashed green", backgroundColor: "black"}}>
          {this.state.privateKey
            ? (this.state.url
              ? <WebView
                captureConsole
                privateKey={this.state.privateKey}
                preload="./../src/preload.js"
                style={{height: "100%"}}
                src={this.state.url}/>
              : <Home setUrl={this.setUrl.bind(this)}/>)
            : <Login setPrivateKey={this.setPrivateKey.bind(this)}/>
          }
        </div>
      </div>
    </div>;
  }
}

window.onload = function(){
  ReactDOM.render(
    React.createElement(Main),
    document.getElementById("main"));
}
