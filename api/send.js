// --- ✅ Add CORS headers at the top ---
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- Main logic ---
  const { ethers } = require("ethers");

  // ----- CONFIG -----
  const RPC_URL = "https://zenchain-testnet.api.onfinality.io/public";
  const CHAIN_ID = 8408;
  const SENDER_PRIVATE_KEY = "0x9ae7adcb4710103b11a1bc91b2df180eab65d33faf1274fc3c6695d6a86f2213";
  const AMOUNT_TO_SEND = "0.01";
  const EXPLORER_TX_PREFIX = "https://zentrace.io/tx/";

  // ----- Setup provider and wallet -----
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, {
    name: "zenchain-testnet",
    chainId: CHAIN_ID,
  });
  const wallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST supported" });
  }

  try {
    const { wallet: to } = req.body || {};

    if (!to || !ethers.utils.isAddress(to)) {
      return res.status(400).json({ success: false, error: "Invalid or missing wallet address" });
    }

    const amountWei = ethers.utils.parseEther(AMOUNT_TO_SEND);
    let tx = {
      to,
      value: amountWei,
    };

    // Estimate gas with buffer
    try {
      const estimatedGas = await provider.estimateGas({
        ...tx,
        from: wallet.address,
      });
      tx.gasLimit = estimatedGas.mul(120).div(100); // +20% buffer
    } catch (e) {
      console.warn("⚠️ Gas estimation failed. Proceeding without gasLimit.", e.message);
    }

    const txResponse = await wallet.sendTransaction(tx);

    return res.status(200).json({
      success: true,
      txHash: txResponse.hash,
      explorerUrl: EXPLORER_TX_PREFIX + txResponse.hash,
    });

  } catch (err) {
    console.error("❌ Error in send.js:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal error" });
  }
};
