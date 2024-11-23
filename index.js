import { ethers } from "./lib/ethers-5.6.esm.min.js";
import { abi, contractAddress, ownerAddress } from "./lib/constants.js";

document.addEventListener("DOMContentLoaded", () => {
  /********************************************
   * Variable
   ********************************************/
  let tempCurrentMintPricePerTokenInETH;

  /********************************************
   * Elements
   ********************************************/
  const elements = {
    connectButton: document.getElementById("connectButton"),
    showMetaMaskAccountAddressConnectedSpan: document.getElementById(
      "showMetaMaskAccountAddressConnectedSpan"
    ),
    showCurrentMintPricePerTokenSpan: document.getElementById(
      "showCurrentMintPricePerTokenSpan"
    ),
    showCurrentMintPricePerTokenButton: document.getElementById(
      "showCurrentMintPricePerTokenButton"
    ),
    showTokensLeftSpan: document.getElementById("showTokensLeftSpan"),
    showTokensLeftButton: document.getElementById("showTokensLeftButton"),
    showTotalSupplySpan: document.getElementById("showTotalSupplySpan"),
    showTotalSupplyButton: document.getElementById("showTotalSupplyButton"),
    addAllNFTsToMetaMaskButton: document.getElementById(
      "addAllNFTsToMetaMaskButton"
    ),
    showTokensIdOfTheOwnerSpan: document.getElementById(
      "showTokensIdOfTheOwnerSpan"
    ),
    fundForm: document.getElementById("fundForm"),
    publicMintToForm: document.getElementById("publicMintToForm"),
    publicMintToNbTokensInput: document.getElementById(
      "publicMintToNbTokensInput"
    ),
    showPublicMintToTotalMintPriceSpan: document.getElementById(
      "showPublicMintToTotalMintPriceSpan"
    ),
    publicSelfMintForm: document.getElementById("publicSelfMintForm"),
    publicSelfMintNbTokensInput: document.getElementById(
      "publicSelfMintNbTokensInput"
    ),
    showPublicSelfTotalMintPriceSpan: document.getElementById(
      "showPublicSelfTotalMintPriceSpan"
    ),
    ownerMintToForm: document.getElementById("ownerMintToForm"),
    ownerSelfMintForm: document.getElementById("ownerSelfMintForm"),
    balanceButton: document.getElementById("balanceButton"),
    showContractBalanceSpan: document.getElementById("showContractBalanceSpan"),
    showSaleStateButton: document.getElementById("showSaleStateButton"),
    withdrawButton: document.getElementById("withdrawButton"),
    setSaleStateForm: document.getElementById("setSaleStateForm"),
    fundButton: document.getElementById("fundButton"),
    publicMintToButton: document.getElementById("publicMintToButton"),
    publicSelfMintButton: document.getElementById("publicSelfMintButton"),
    ownerMintToButton: document.getElementById("ownerMintToButton"),
    ownerSelfMintButton: document.getElementById("ownerSelfMintButton"),
    setSaleStateButton: document.getElementById("setSaleStateButton"),
    showSaleStateSpan: document.getElementById("showSaleStateSpan"),
    onlyOwnerCanSeeDiv: document.getElementById("onlyOwnerCanSeeDiv"),
  };

  /********************************************
   * Event Listeners
   ********************************************/
  addEventListeners();

  /********************************************
   * Functions
   ********************************************/

  async function connect() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      try {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts.length > 0) {
          elements.connectButton.innerText = "MetaMask connected";
          elements.connectButton.disabled = true;
          showOrHideOnlyOwnerCanSeeDiv(accounts);
          console.log("The active account connected is:", accounts[0]);
          updateSpanText(
            elements.showMetaMaskAccountAddressConnectedSpan,
            `Welcome: ${accounts[0]}`
          );
          ethereum.on("accountsChanged", handleAccountsChanged);
          await showCurrentMintPricePerToken();
        } else {
          showOrHideOnlyOwnerCanSeeDiv(accounts);
          alert("No accounts are connected, please connect MetaMask.");
          updateSpanText(
            elements.showMetaMaskAccountAddressConnectedSpan,
            `No accounts are connected, please connect MetaMask.`
          );
        }
      } catch (error) {
        if (error.code === 4001) {
          // EIP-1193 userRejectedRequest error
          console.error("MetaMask connection error:", error);
          alert("Connection request was rejected.");
        } else {
          handleConnectError(error);
        }
      }
    }
  }

  async function showCurrentMintPricePerToken() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      try {
        const price = await getCurrentMintPricePerToken();
        tempCurrentMintPricePerTokenInETH = price;
        const formattedPrice = ethers.utils.formatUnits(price, "ether");
        updateSpanText(
          elements.showCurrentMintPricePerTokenSpan,
          `${formattedPrice} ETH`
        );
        console.log("Current Mint Price Per Token:", formattedPrice, "ETH");

        await showTotalPriceForPublicMintTo();
        await showTotalPriceForPublicSelfMint();
      } catch (error) {
        console.error("Error showing current mint price per token:", error);
      }
    }
  }

  async function addAllNFTsToMetaMask() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.addAllNFTsToMetaMaskButton, "ADDING NFTs...");
      try {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        const tokenIds = await getWalletOfOwner(accounts[0]);

        if (tokenIds.length <= 0) {
          alert("No NFTs to add to MetaMask.");
          return;
        }

        await addMultipleNFTsToMetaMask(tokenIds);
        console.log("NFTs have been added to MetaMask.");
        updateSpanText(
          elements.showTokensIdOfTheOwnerSpan,
          tokenIds.map((num) => `#${num}`).join(", ")
        );
      } catch (error) {
        console.error("Error adding all NFTs to MetaMask:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.addAllNFTsToMetaMaskButton);
      }
    }
  }

  async function fund(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.fundButton, "FUNDING...");

      const formData = new FormData(event.target);
      const ethAmountToFund = formData.get("ethAmountToFund");
      const totalPrice = ethers.utils.parseEther(ethAmountToFund);

      try {
        const { provider, signer, contract } =
          await getProviderSignerContract();

        // Get the user's balance
        const balance = await signer.getBalance();

        // Check if the user's balance is sufficient
        if (balance.lt(totalPrice)) {
          alert(
            "Insufficient balance. Please ensure you have enough ETH to complete the transaction."
          );
          resetButton(elements.fundButton);
          return;
        }

        const transactionResponse = await contract.fund({
          value: totalPrice,
        });
        const receipt = await listenForTransactionMine(
          transactionResponse,
          provider
        );
        logReceiptInformation(receipt);
        alert("Thanks for funding.");

        contract.on("Funded", (funder, amount, event) => {
          console.log(
            `${funder} funded ${ethers.utils.formatEther(
              amount
            )} to the contract`
          );
          console.log("Funded event:", event);
        });
      } catch (error) {
        console.error("Funding failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.fundButton);
        clearFormInputs(event.target);
      }
    }
  }

  async function publicMintNFTTo(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.publicMintToButton, "MINTING...");

      const formData = new FormData(event.target);
      const nbTokens = Number(formData.get("nbTokens"));
      const recipient = formData.get("recipient").trim();

      if (nbTokens < 1 || nbTokens > 100) {
        alert("Please enter a number between 1 and 100.");
        return;
      }

      if (!isValidEthereumAddress(recipient)) {
        alert("Invalid Ethereum address. Please enter a valid address.");
        resetButton(elements.publicMintToButton);
        return;
      }

      try {
        const price = await getCurrentMintPricePerToken();
        const totalPrice = price.mul(nbTokens);

        // Get the user's balance
        const { signer } = await getProviderSignerContract();
        const balance = await signer.getBalance();

        // Check if the user's balance is sufficient
        if (balance.lt(totalPrice)) {
          alert(
            "Insufficient balance. Please ensure you have enough ETH to complete the transaction."
          );
          resetButton(elements.publicMintToButton);
          return;
        }

        const receipt = await publicMintNFTs(recipient, nbTokens, totalPrice);
        logReceiptInformation(receipt);
        alert("Minted Successfully");
      } catch (error) {
        console.error("Minting failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.publicMintToButton);
        clearFormInputs(event.target);
      }
    }
  }

  async function publicSelfMintNFT(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.publicSelfMintButton, "MINTING...");

      const formData = new FormData(event.target);
      const nbTokens = Number(formData.get("nbTokens"));

      if (nbTokens < 1 || nbTokens > 100) {
        alert("Please enter a number between 1 and 100.");
        return;
      }

      try {
        const price = await getCurrentMintPricePerToken();
        const totalPrice = price.mul(nbTokens);

        // Get the user's balance
        const { signer } = await getProviderSignerContract();
        const balance = await signer.getBalance();

        // Check if the user's balance is sufficient
        if (balance.lt(totalPrice)) {
          alert(
            "Insufficient balance. Please ensure you have enough ETH to complete the transaction."
          );
          resetButton(elements.publicSelfMintButton);
          return;
        }

        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        const receipt = await publicMintNFTs(accounts[0], nbTokens, totalPrice);
        logReceiptInformation(receipt);
        alert("Minted Successfully");
        // Refresh token balance
        await showTotalSupply();
        await showTokensLeft();
      } catch (error) {
        console.error("Minting failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.publicSelfMintButton);
        clearFormInputs(event.target);
      }
    }
  }

  async function showTotalPriceForPublicMintTo() {
    if (
      elements.publicMintToNbTokensInput &&
      elements.showPublicMintToTotalMintPriceSpan
    ) {
      const nbTokens = Number(elements.publicMintToNbTokensInput.value);
      const totalPrice = tempCurrentMintPricePerTokenInETH.mul(nbTokens);
      updateSpanText(
        elements.showPublicMintToTotalMintPriceSpan,
        ethers.utils.formatUnits(totalPrice, "ether") + " ETH"
      );
    }
  }

  async function showTotalPriceForPublicSelfMint() {
    if (
      elements.publicSelfMintNbTokensInput &&
      elements.showPublicSelfTotalMintPriceSpan
    ) {
      const nbTokens = Number(elements.publicSelfMintNbTokensInput.value);
      const totalPrice = tempCurrentMintPricePerTokenInETH.mul(nbTokens);
      updateSpanText(
        elements.showPublicSelfTotalMintPriceSpan,
        ethers.utils.formatUnits(totalPrice, "ether") + " ETH"
      );
    }
  }

  async function showTokensLeft() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      try {
        const tokensLeft = await getTokensLeft();
        updateSpanText(elements.showTokensLeftSpan, tokensLeft.toString());
      } catch (error) {
        console.error("Error showing tokens left:", error);
      }
    }
  }

  async function showTotalSupply() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      try {
        const totalSupply = await getTotalSupply();
        updateSpanText(elements.showTotalSupplySpan, totalSupply.toString());
      } catch (error) {
        console.error("Error showing total supply:", error);
      }
    }
  }

  async function ownerMintNFTTo(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.ownerMintToButton, "MINTING...");

      const formData = new FormData(event.target);
      const nbTokens = Number(formData.get("nbTokens"));
      const recipient = formData.get("recipient").trim();

      if (!isValidEthereumAddress(recipient)) {
        alert("Invalid Ethereum address. Please enter a valid address.");
        resetButton(elements.ownerMintToButton);
        return;
      }

      try {
        const receipt = await ownerMintNFTs(recipient, nbTokens);
        logReceiptInformation(receipt);
        alert("Minted Successfully");
      } catch (error) {
        console.error("Minting failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.ownerMintToButton);
        clearFormInputs(event.target);
      }
    }
  }

  async function ownerSelfMintNFT(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.ownerSelfMintButton, "MINTING...");

      const formData = new FormData(event.target);
      const nbTokens = Number(formData.get("nbTokens"));

      try {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        const receipt = await ownerMintNFTs(accounts[0], nbTokens);
        logReceiptInformation(receipt);
        alert("Minted Successfully");
      } catch (error) {
        console.error("Minting failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.ownerSelfMintButton);
        clearFormInputs(event.target);
      }
    }
  }

  async function showBalance() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.balanceButton, "FETCHING...");
      try {
        const balance = await getBalance();
        updateSpanText(
          elements.showContractBalanceSpan,
          `${ethers.utils.formatEther(balance)} ETH.`
        );
      } catch (error) {
        console.error("Error showing balance:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.balanceButton);
      }
    }
  }

  async function showSaleState() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.showSaleStateButton, "FETCHING...");
      try {
        const saleState = await getSaleState();

        updateSpanText(elements.showSaleStateSpan, `${saleState}`);
      } catch (error) {
        console.error("Error showing sale state:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.showSaleStateButton);
      }
    }
  }

  async function withdraw() {
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.withdrawButton, "WITHDRAWING...");
      try {
        const balance = await getBalance();
        if (balance.isZero()) {
          alert("Balance of contract is zero, nothing to withdraw.");
          resetButton(elements.withdrawButton);
          return;
        }

        const { provider, contract } = await getProviderSignerContract();
        const transactionResponse = await contract.ownerWithdrawAll();
        const receipt = await listenForTransactionMine(
          transactionResponse,
          provider
        );
        logReceiptInformation(receipt);
        alert("Balance has been withdrawn.");
      } catch (error) {
        console.error("Withdrawal failed:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.withdrawButton);
      }
    }
  }

  async function setNFTSaleState(event) {
    event.preventDefault();
    if ((await checkMetaMask()) && (await checkNetwork())) {
      disableButton(elements.setSaleStateButton, "SETTING SALE STATE...");

      const formData = new FormData(event.target);
      const newState = formData.get("saleState") === "true";
      console.log("Sale state:", newState);

      try {
        const { provider, contract } = await getProviderSignerContract();
        const transactionResponse = await contract.setSaleState(newState);
        const receipt = await listenForTransactionMine(
          transactionResponse,
          provider
        );
        logReceiptInformation(receipt);
        alert(`Sale state is set to ${newState}`);
      } catch (error) {
        console.error("Error setting sale state:", error);
        alert("Something went wrong! Please try again later.");
      } finally {
        resetButton(elements.setSaleStateButton);
      }
    }
  }

  /********************************************
   * Helper Functions
   ********************************************/

  function addEventListeners() {
    if (elements.connectButton)
      elements.connectButton.addEventListener("click", connect);
    if (elements.showCurrentMintPricePerTokenButton)
      elements.showCurrentMintPricePerTokenButton.addEventListener(
        "click",
        showCurrentMintPricePerToken
      );
    if (elements.addAllNFTsToMetaMaskButton)
      elements.addAllNFTsToMetaMaskButton.addEventListener(
        "click",
        addAllNFTsToMetaMask
      );
    if (elements.fundForm) elements.fundForm.addEventListener("submit", fund);
    if (elements.publicMintToForm)
      elements.publicMintToForm.addEventListener("submit", publicMintNFTTo);
    if (elements.publicSelfMintForm)
      elements.publicSelfMintForm.addEventListener("submit", publicSelfMintNFT);
    if (elements.publicMintToNbTokensInput)
      elements.publicMintToNbTokensInput.addEventListener(
        "input",
        showTotalPriceForPublicMintTo
      );
    if (elements.publicSelfMintNbTokensInput)
      elements.publicSelfMintNbTokensInput.addEventListener(
        "input",
        showTotalPriceForPublicSelfMint
      );
    if (elements.showTokensLeftButton)
      elements.showTokensLeftButton.addEventListener("click", showTokensLeft);
    if (elements.showTotalSupplyButton)
      elements.showTotalSupplyButton.addEventListener("click", showTotalSupply);
    if (elements.ownerMintToForm)
      elements.ownerMintToForm.addEventListener("submit", ownerMintNFTTo);
    if (elements.ownerSelfMintForm)
      elements.ownerSelfMintForm.addEventListener("submit", ownerSelfMintNFT);
    if (elements.balanceButton)
      elements.balanceButton.addEventListener("click", showBalance);
    if (elements.showSaleStateButton)
      elements.showSaleStateButton.addEventListener("click", showSaleState);
    if (elements.withdrawButton)
      elements.withdrawButton.addEventListener("click", withdraw);
    if (elements.setSaleStateForm)
      elements.setSaleStateForm.addEventListener("submit", setNFTSaleState);
  }

  function handleConnectError(error) {
    console.error("MetaMask connection error:", error);
    alert(
      error.message.includes("User rejected")
        ? "Connection Rejected, please try again."
        : "Connection Failed, please try again."
    );
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      showOrHideOnlyOwnerCanSeeDiv(accounts);
      elements.connectButton.innerHTML = "Connect MetaMask";
      elements.connectButton.disabled = false;
      alert("No accounts are connected, please connect MetaMask.");
      updateSpanText(
        elements.showMetaMaskAccountAddressConnectedSpan,
        `No accounts are connected, please connect MetaMask.`
      );
    } else {
      showOrHideOnlyOwnerCanSeeDiv(accounts);
      console.log("Active account changed to:", accounts[0]);
      updateSpanText(
        elements.showMetaMaskAccountAddressConnectedSpan,
        `Welcome: ${accounts[0]}`
      );
    }
  }

  async function publicMintNFTs(recipient, nbTokens, etherAmount) {
    const { provider, contract } = await getProviderSignerContract();
    const transactionResponse = await contract.publicMintTo(
      recipient,
      nbTokens,
      { value: etherAmount }
    );
    contract.on("Transfer", (from, to, tokenId, event) => {
      console.log(`NFT of tokenId #${tokenId} was sent from ${from} to ${to}`);
      console.log("Transfer event:", event);
    });
    return listenForTransactionMine(transactionResponse, provider);
  }

  async function ownerMintNFTs(recipient, nbTokens) {
    const { provider, contract } = await getProviderSignerContract();
    const transactionResponse = await contract.ownerMintTo(recipient, nbTokens);
    contract.on("Transfer", (from, to, tokenId, event) => {
      console.log(`NFT of tokenId #${tokenId} was sent from ${from} to ${to}`);
      console.log("Transfer event:", event);
    });
    return listenForTransactionMine(transactionResponse, provider);
  }

  async function addMultipleNFTsToMetaMask(tokenIds) {
    const requests = tokenIds.map((tokenId) => ({
      method: "wallet_watchAsset",
      params: {
        type: "ERC721",
        options: {
          address: contractAddress,
          tokenId: tokenId.toString(),
        },
      },
    }));

    window.ethereum.sendAsync(requests, (error, results) => {
      if (error) {
        console.error("Error adding NFTs to MetaMask", error);
      } else {
        results.forEach((result, index) => {
          if (result) {
            console.log(`User successfully added token ID #${tokenIds[index]}`);
          } else {
            console.log(`User did not add token ID #${tokenIds[index]}`);
          }
        });
      }
    });
  }

  async function getWalletOfOwner(ownerAddress) {
    try {
      const { contract } = await getProviderAndContract();
      const tokenIds = await contract.walletOfOwner(ownerAddress);
      console.log("Token IDs owned by", ownerAddress, ":", tokenIds);
      return tokenIds;
    } catch (error) {
      console.error("Error getting wallet of owner:", error);
    }
  }

  function listenForTransactionMine(transactionResponse, provider) {
    console.log(`Mining ${transactionResponse.hash}`);
    return new Promise((resolve, reject) => {
      provider.once(transactionResponse.hash, (transactionReceipt) => {
        transactionReceipt.status === 0
          ? reject(transactionReceipt)
          : resolve(transactionReceipt);
      });
    });
  }

  function logReceiptInformation(receipt) {
    console.log("Transaction Receipt:");
    console.log(` - Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
    console.log(` - Block Hash: ${receipt.blockHash}`);
    console.log(` - Transaction Index: ${receipt.transactionIndex}`);
    console.log(` - From: ${receipt.from}`);
    console.log(` - To: ${receipt.to}`);
    console.log(` - Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(
      ` - Cumulative Gas Used: ${receipt.cumulativeGasUsed.toString()}`
    );
    console.log(` - Contract Address: ${receipt.contractAddress}`);
    console.log(` - Confirmations: ${receipt.confirmations}`);
    console.log(` - Confirmed in block ${receipt.blockNumber}`);
  }

  async function getCurrentMintPricePerToken() {
    try {
      const { contract } = await getProviderAndContract();
      return await contract.currentMintPricePerToken();
    } catch (error) {
      console.error("Error getting current mint price per token:", error);
      throw error;
    }
  }

  async function getTokensLeft() {
    try {
      const { contract } = await getProviderAndContract();
      const tokensLeft = await contract.getTokensLeft();
      console.log("Tokens Left:", tokensLeft.toString());
      return tokensLeft;
    } catch (error) {
      console.error("Error getting tokens left:", error);
    }
  }

  async function getTotalSupply() {
    try {
      const { contract } = await getProviderAndContract();
      const supply = await contract.totalSupply();
      console.log("Total Supply:", supply.toString());
      return supply;
    } catch (error) {
      console.error("Error getting total supply:", error);
    }
  }

  async function getBalance() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(contractAddress);
      return balance;
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }

  async function getSaleState() {
    try {
      const { contract } = await getProviderAndContract();
      const saleState = await contract.getSaleState();
      return saleState;
    } catch (error) {
      console.error("Error fetching sale state:", error);
    }
  }

  async function getProviderSignerContract() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    return { provider, signer, contract };
  }

  async function getProviderAndContract() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    return { provider, contract };
  }

  async function checkMetaMask() {
    if (typeof window.ethereum !== "undefined") {
      return true;
    } else {
      alert("Please install MetaMask first!");
      return false;
    }
  }

  async function checkNetwork() {
    const EXPECTED_CHAIN_ID = 1;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { chainId } = await provider.getNetwork();
    console.log("Network's chainId:", chainId);
    if (chainId !== EXPECTED_CHAIN_ID) {
      alert("Please connect to the Ethereum Mainnet.");
      return false;
    }
    return true;
  }

  function disableButton(button, text) {
    if (button) {
      button.setAttribute("data-original-text", button.innerText); // Store the original text
      button.disabled = true;
      button.innerText = text;
    }
  }

  function resetButton(button) {
    if (button) {
      button.disabled = false;
      button.innerText = button.getAttribute("data-original-text"); // Retrieve the original text
    }
  }

  function updateSpanText(spanElement, text) {
    if (spanElement) {
      spanElement.innerText = text;
    }
  }

  function isValidEthereumAddress(address) {
    return ethers.utils.isAddress(address);
  }

  function showOrHideOnlyOwnerCanSeeDiv(accounts) {
    if (accounts.length === 0)
      elements.onlyOwnerCanSeeDiv.style.display = "none";

    if (elements.onlyOwnerCanSeeDiv) {
      if (
        accounts.length > 0 &&
        areEthAddressesEqual(accounts[0], ownerAddress)
      ) {
        elements.onlyOwnerCanSeeDiv.style.display = "block";
      } else {
        elements.onlyOwnerCanSeeDiv.style.display = "none";
      }
    }
  }

  function areEthAddressesEqual(address1, address2) {
    try {
      const checksumAddress1 = ethers.utils.getAddress(address1);
      const checksumAddress2 = ethers.utils.getAddress(address2);
      return checksumAddress1 === checksumAddress2;
    } catch (error) {
      console.error("Invalid address:", error);
      return false;
    }
  }

  function clearFormInputs(form) {
    Array.from(form.elements).forEach((input) => {
      if (input.tagName === "INPUT") {
        input.value = "";
      }
    });
  }
});
