"use strict";

/**
 * Example JavaScript code that interacts with the page and Web3 wallets
 */

 // Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;


// Address of the selected account
let selectedAccount;

var myWeb3;


/**
 * Setup the orchestra
 */
function init() {

  console.log("Initializing example");
  console.log("WalletConnectProvider is", WalletConnectProvider);
  console.log("Fortmatic is", Fortmatic);
  console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);

  // Check that the web page is run in a secure context,
  // as otherwise MetaMask won't be available
  if(location.protocol !== 'https:') {
    // https://ethereum.stackexchange.com/a/62217/620
    alert("Cannot use the blockchain without https")
    return;
  }

  // Tell Web3modal what providers we have available.
  // Built-in web browser provider (only one can exist as a time)
  // like MetaMask, Brave or Opera is added automatically by Web3modal
  const providerOptions = {
    rpc: {
      43114: "https://api.avax.network/ext/bc/C/rpc"
    }, 
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        // Mikko's test key - don't copy as your mileage may vary
        infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
      }
    },

    fortmatic: {
      package: Fortmatic,
      options: {
        // Mikko's TESTNET api key
        key: "pk_test_391E26A3B43A3350"
      }
    }
  };

  web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
  });

  console.log("Web3Modal instance is", web3Modal);
}


/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {

    console.log("fetchAccountData")

  // Get a Web3 instance for the wallet
  const web3 = new Web3(provider);
  myWeb3 = web3;

  console.log("Web3 instance is", web3);

  // Get connected chain id from Ethereum node
  const chainId = await web3.eth.getChainId();
  console.log(chainId);

  var chainData;

  // Load chain information over an HTTP API
  if (chainId != 31337) { 
    try {
    chainData = evmChains.getChain(chainId);
    } catch (e) {
        console.log(e);
        if (chainId == 43114) {
          chainData = {
            "name": "Avalanche"
          }
        } else if (chainId == 43113) {
          chainData = {
            "name": "Avalanche Fuji"
          }
        }
    }
    document.querySelector("#network-name").textContent = "Network: " + chainData.name;
  }

  $("#inside-btn-connect").text("Connected")
  $("#inside-btn-connect").prop("disabled",true);

  // Get list of accounts of the connected wallet
  const accounts = await web3.eth.getAccounts();

  // MetaMask does not give you all accounts, only the selected account
  console.log("Got accounts", accounts);
  selectedAccount = accounts[0];

  document.querySelector("#selected-account").textContent = " - Wallet: " + selectedAccount;
  $("#accountBalance").show();
  instantiateMainContract();
  getApr();


   // Go through all accounts and get their ETH balance
   const rowResolvers = accounts.map(async (address) => {
     const balance = await web3.eth.getBalance(address);
     // ethBalance is a BigNumber instance
     // https://github.com/indutny/bn.js/
     const ethBalance = web3.utils.fromWei(balance, "ether");
     const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);
     // Fill in the templated row and put in the document
     $("#avaxBalance").text(humanFriendlyBalance)

     $()

   });
 
   // Because rendering account does its own RPC commucation
   // with Ethereum node, we do not want to display any results
   // until data for all accounts is loaded
   await Promise.all(rowResolvers);


  // Display fully loaded UI for wallet data
  //document.querySelector("#connected").style.display = "block";
}



/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {

  // If any current data is displayed when
  // the user is switching acounts in the wallet
  // immediate hide this data
  // document.querySelector("#connected").style.display = "none";

  // Disable button while UI is loading.
  // fetchAccountData() will take a while as it communicates
  // with Ethereum node via JSON-RPC and loads chain data
  // over an API call.
  document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
  await fetchAccountData(provider);
  document.querySelector("#btn-connect").removeAttribute("disabled")
}


/**
 * Connect wallet button pressed.
 */
async function onConnect() {

  console.log("Opening a dialog", web3Modal);
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  // Subscribe to accounts change
provider.on("accountsChanged", (accounts) => {
      
    fetchAccountData();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    fetchAccountData();
  });

  // Subscribe to networkId change
  provider.on("networkChanged", (networkId) => {
    fetchAccountData();
  });

  await refreshAccountData();
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {

  console.log("Killing the wallet connection", provider);

  // TODO: Which providers have close method?
  if(provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  // document.querySelector("#connected").style.display = "none";

  //$("#btn-disconnect").hide()
  $("#btn-connect").show()
  
}


/**
 * Main entry point.
 */
window.addEventListener('load', async () => {
  init();
  //document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
});

function connectWallet() {
    onConnect()

}


var mainContract; 

function instantiateMainContract() {
  var main_contract_address = "0xd772f2c2495DEf0bD3d5d251dE6d0a8bbebff3a3";
  mainContract = new myWeb3.eth.Contract(mainABI, main_contract_address);
}


function getApr() {
  mainContract.methods.aaveAPR().call().then(function(result) {
    console.log("AAVE APR: " + JSON.stringify(result));
    var depositAPR = result[0]/10000
    var incentiveDepositAPRPercent = result[1]/10000
    var variableBorrowAPR = result[2]/10000
    var incentiveBorrowAPRPercent = result[3]/10000
    var stableBorrowAPR = result[4]/10000
    console.log(depositAPR)

    $("#AAVEdepAPR").text(depositAPR)
    $("#AAVEincentiveDepositAPRPercent").text(incentiveDepositAPRPercent)
    $("#AAVEvariableBorrowAPR").text(variableBorrowAPR)
    $("#AAVEincentiveBorrowAPRPercent").text(incentiveBorrowAPRPercent)
    $("#AAVEstableBorrowAPR").text(stableBorrowAPR)

    var arrayAPY = APRtoAPY(depositAPR, variableBorrowAPR, stableBorrowAPR)
    console.log(arrayAPY[0])
    console.log(arrayAPY[1])
    console.log(arrayAPY[2])

  });
}

function APRtoAPY(depositAPR, variableBorrowAPR, stableBorrowAPR) {
  const SECONDS_PER_YEAR = 31536000;

  // APR to APY
  const depositAPY = ((1 + (depositAPR / SECONDS_PER_YEAR)) * SECONDS_PER_YEAR) - 1;
  const variableBorrowAPY = ((1 + (variableBorrowAPR / SECONDS_PER_YEAR)) * SECONDS_PER_YEAR) - 1;
  const stableBorrowAPY = ((1 + (stableBorrowAPR / SECONDS_PER_YEAR)) ** SECONDS_PER_YEAR) - 1;

  return {depositAPY, variableBorrowAPY, stableBorrowAPY};
}